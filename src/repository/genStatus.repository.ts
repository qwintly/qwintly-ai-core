import { EventType, GenStep } from "../types/events.js";
import { DBRepository } from "./repository.js";

export type PersistedStatusEvent = {
  event_type: string;
  step?: string | null;
  message?: string | null;
  source?: string | null;
  seq_num: number;
};

export class GenStatusRepository extends DBRepository {
  async persistStatusMessage(
    chatId: string,
    sessionId: string,
    eventType: EventType,
    step: GenStep,
    message: string,
    source: string,
    displayedSummary: boolean,
  ): Promise<PersistedStatusEvent> {
    const { data, error } = await this.client.rpc("persist_generation_event", {
      p_conv_id: chatId,
      p_gen_id: sessionId,
      p_event_type: eventType,
      p_step: step,
      p_message: message,
      p_source: source,
      p_displayed_summary: displayedSummary,
    });

    if (error) {
      throw new Error(
        `Failed calling persist_generation_event RPC: ${error.message}`,
      );
    }

    return data as PersistedStatusEvent;
  }
}
