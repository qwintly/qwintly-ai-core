import { DBRepository } from "./repository.js";

export class GenToolCallsRepository extends DBRepository {
  async persistToolCall(
    sessionId: string,
    toolName: string,
    toolParams: any,
    toolOutput: any,
  ): Promise<void> {
    const { error } = await this.client.from("gen_tool_calls").insert({
      gen_id: sessionId,
      tool_call_name: toolName,
      tool_params: toolParams,
      tool_final_output: toolOutput,
    });
    if (error) {
      throw new Error(`Failed calling persist_tool_call RPC: ${error.message}`);
    }
  }
}
