import { PersistedStatusEvent } from "../repository/genStatus.repository.js";
import { EventType, GenStep } from "../types/events.js";
import { assertNonEmpty, StatusServiceError } from "./logging.utils.js";

export interface StatusRepository {
  persist(
    chatId: string,
    sessionId: string,
    eventType: EventType,
    step: GenStep,
    message: string,
    source: string,
    displayedSummary: boolean,
  ): Promise<PersistedStatusEvent>;
}

export interface StatusPublisher {
  publish(
    chatId: string,
    genId: string,
    event: PersistedStatusEvent,
  ): Promise<void>;
}

export interface StatusServiceDeps {
  repository: StatusRepository;
  publisher: StatusPublisher;
}

export const statusService = async ({
  chatId,
  sessionId,
  eventType,
  step,
  message,
  source,
  deps,
  displayedSummary,
  seqNum,
}: {
  chatId: string;
  sessionId: string;
  eventType: EventType;
  step: GenStep;
  message: string;
  source: string;
  deps: StatusServiceDeps;
  displayedSummary: boolean;
  seqNum: number;
}): Promise<PersistedStatusEvent> => {
  const { repository, publisher } = deps;

  assertNonEmpty(chatId, "chatId");
  assertNonEmpty(message, "message");
  assertNonEmpty(source, "source");

  // Postgres write promise
  const dbPromise = (async (): Promise<PersistedStatusEvent> => {
    try {
      return await repository.persist(
        chatId,
        sessionId,
        eventType,
        step,
        message,
        source,
        displayedSummary,
      );
    } catch (error) {
      throw new StatusServiceError(
        "PERSISTENCE_FAILED",
        "Failed to persist status event",
        {
          cause: error,
          context: { chatId, eventType, step, source },
        },
      );
    }
  })();

  // Redis publish promise using client-side sequence number
  const redisPromise = (async (): Promise<void> => {
    try {
      await publisher.publish(chatId, sessionId, {
        event_type: eventType,
        step: step ?? null,
        message: message ?? null,
        source: source ?? null,
        seq_num: seqNum,
      });
    } catch (error) {
      console.error("Failed publishing status event to Redis", {
        chatId,
        seqNum,
        error,
      });
      throw new StatusServiceError(
        "REDIS_PUBLISH_FAILED",
        "Failed to publish status event to Redis",
        {
          cause: error,
          context: { chatId, eventType, step, source, seqNum },
        },
      );
    }
  })();

  // Run concurrently
  let dbResult: PersistedStatusEvent | undefined;
  let dbError: any;
  let redisError: any;

  await Promise.allSettled([dbPromise, redisPromise]).then((results) => {
    const dbRes = results[0];
    const redisRes = results[1];

    if (dbRes.status === "rejected") {
      dbError = dbRes.reason;
    } else {
      dbResult = dbRes.value;
    }

    if (redisRes.status === "rejected") {
      redisError = redisRes.reason;
    }
  });

  if (dbError) {
    throw dbError;
  }

  if (redisError) {
    throw redisError;
  }

  return dbResult!;
};
