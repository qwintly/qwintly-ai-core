import { GenerateGeminiReponse } from "./gemini.client.js";

export const getClient = (
  provider: string,
  apiKey: string,
  model?: string,
) => {
  if (provider === "gemini") {
    return new GenerateGeminiReponse(apiKey, model);
  }
  throw new Error(`Unknown provider: ${provider}`);
};
