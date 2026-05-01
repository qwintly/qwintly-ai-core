import {
  FunctionCallingConfigMode,
  GenerateContentConfig,
  GoogleGenAI,
  Tool,
} from "@google/genai";
import type { ZodSchema } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const DEFAULT_MODEL = "gemini-2.5-flash-lite";

type AIResponseOptions = {
  tools?: Tool[];
  schema?: ZodSchema;
  toolCallingMode?: FunctionCallingConfigMode;
};

export class GenerateGeminiReponse {
  public gemini: GoogleGenAI;
  public model: string = DEFAULT_MODEL;

  constructor(geminiApiKey: string, model?: string) {
    this.gemini = new GoogleGenAI({ apiKey: geminiApiKey });
    if (model) {
      this.model = model;
    }
  }

  public async aiResponse(request: unknown, options: AIResponseOptions = {}) {
    const {
      tools,
      schema,
      toolCallingMode = FunctionCallingConfigMode.AUTO,
    } = options;

    const config: GenerateContentConfig = {};

    if (tools && tools.length > 0) {
      config.tools = tools;
      config.toolConfig = {
        functionCallingConfig: {
          mode: toolCallingMode,
        },
      };
    }

    if (schema) {
      config.responseMimeType = "application/json";
      config.responseJsonSchema = zodToJsonSchema(schema as any);
    }

    try {
      return await this.gemini.models.generateContent({
        model: this.model,
        contents: request as any,
        ...(Object.keys(config).length > 0 && { config }),
      });
    } catch (err: any) {
      throw new Error(
        `AI generation failed: ${err?.message || "Unknown error"}`,
      );
    }
  }
}
