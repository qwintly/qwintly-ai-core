import { TokenPersistence } from "../types/runner.types.js";
import {
  extractUsageTokenCounts,
  persistTokensOnce,
} from "../helpers/persistTokens.helpers.js";

export class TokenPersistenceManager {
  private tokenPersistence: TokenPersistence | undefined;
  private totalInputTokens = 0;
  private totalOutputTokens = 0;
  private sawAnyTokenUsage = false;

  constructor(tokenPersistence: TokenPersistence | undefined) {
    this.tokenPersistence = tokenPersistence;
  }

  public recordUsage(response: any) {
    const usage = extractUsageTokenCounts(response);
    if (usage) {
      this.sawAnyTokenUsage = true;
      this.totalInputTokens += usage.inputTokens;
      this.totalOutputTokens += usage.outputTokens;
    }
  }

  public async persist() {
    await persistTokensOnce(
      this.tokenPersistence,
      this.sawAnyTokenUsage,
      this.totalInputTokens,
      this.totalOutputTokens,
    );
  }
}
