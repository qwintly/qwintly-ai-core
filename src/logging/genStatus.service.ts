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

export const statusService = async (
  chatId: string,
  sessionId: string,
  eventType: EventType,
  step: GenStep,
  message: string,
  source: string,
  deps: StatusServiceDeps,
): Promise<PersistedStatusEvent> => {
  const { repository, publisher } = deps;

  assertNonEmpty(chatId, "chatId");
  assertNonEmpty(message, "message");
  assertNonEmpty(source, "source");

  let persistedEvent: PersistedStatusEvent;

  try {
    persistedEvent = await repository.persist(
      chatId,
      sessionId,
      eventType,
      step,
      message,
      source,
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

  try {
    await publisher.publish(chatId, sessionId, persistedEvent);
    return persistedEvent;
  } catch (error) {
    console.error("Failed publishing status event to Redis", {
      chatId,
      seq_num: persistedEvent.seq_num,
      error,
    });

    throw new StatusServiceError(
      "REDIS_PUBLISH_FAILED",
      "Status event persisted but failed to publish to Redis",
      {
        cause: error,
        context: {
          chatId,
          persistedEvent,
        },
      },
    );
  }
};
