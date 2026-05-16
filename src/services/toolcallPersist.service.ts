import { GenToolCallsRepository } from "../repository/genToolCalls.repository.js";

let toolCallsRepository: GenToolCallsRepository | null = null;
let sessionId = "";
export const initializeToolCallsRepository = (
  endpoint: string,
  secret: string,
  session: string,
) => {
  toolCallsRepository = new GenToolCallsRepository(endpoint, secret);
  sessionId = session;
};

export const persistToolCall = async (
  toolName: string,
  toolParams: any,
  toolOutput: any,
) => {
  if (!toolCallsRepository || !sessionId) {
    console.error("ToolCall repo not initialized");
    return;
  }

  await toolCallsRepository.persistToolCall(
    sessionId,
    toolName,
    toolParams,
    toolOutput,
  );
};
