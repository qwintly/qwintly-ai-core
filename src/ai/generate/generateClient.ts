import { GenerateGeminiReponse } from "./gemini.client.js";

const providerFactory = {
  gemini: GenerateGeminiReponse,
};

export const getClient = (provider: string, apiKey: string, model?: string) => {
  const GenerateReponse =
    providerFactory[provider as keyof typeof providerFactory];
  if (!GenerateReponse) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  return new GenerateReponse(apiKey, model);
};
