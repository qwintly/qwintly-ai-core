import { TokenPersistence } from "../toolLoopRunner.js";

export const persistTokensOnce = async (
  tokenPersistence: TokenPersistence | undefined,
  sawAnyTokenUsage: boolean,
  totalInputTokens: number,
  totalOutputTokens: number,
) => {
  if (!tokenPersistence) return;
  if (!sawAnyTokenUsage) return;

  try {
    await tokenPersistence.repository.persistGenTokens(
      tokenPersistence.sessionId,
      totalInputTokens,
      totalOutputTokens,
      tokenPersistence.model,
    );
  } catch (err) {
    console.error("Tool loop: failed to persist gen tokens", err);
  }
};

export const extractUsageTokenCounts = (rawResponse: unknown) => {
  const usage = (rawResponse as any)?.usageMetadata;
  const promptTokenCount = usage?.promptTokenCount;
  const candidatesTokenCount = usage?.candidatesTokenCount;

  const inputTokens = Number(promptTokenCount);
  const outputTokens = Number(candidatesTokenCount);

  if (!Number.isFinite(inputTokens) || inputTokens < 0) return null;
  if (!Number.isFinite(outputTokens) || outputTokens < 0) return null;

  return { inputTokens, outputTokens };
};
