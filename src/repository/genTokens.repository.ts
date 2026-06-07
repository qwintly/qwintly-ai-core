import { DBRepository } from "./repository.js";

export class GenTokensRepository extends DBRepository {
  public async persistGenTokens(
    sessionId: string,
    input_tokens: number,
    output_tokens: number,
    model: string,
  ): Promise<void> {
    const { error } = await this.client.rpc("persist_gen_tokens", {
      p_gen_id: sessionId,
      p_input_tokens: input_tokens,
      p_output_tokens: output_tokens,
      p_model: model,
    });

    if (error) {
      console.error(`Failed calling persist_gen_tokens RPC: ${error.message}`);
    }
  }
}
