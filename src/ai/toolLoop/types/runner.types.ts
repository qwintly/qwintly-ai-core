import { FunctionCallingConfigMode, Tool } from "@google/genai";
import type { GenTokensRepository } from "../../../repository/genTokens.repository.js";
import { EventType } from "../../../types/events.js";
import { ToolLoopContextPolicy } from "./context.types.js";

export type ToolLoopResult = {
  contents: any[];
  modelContents: any[];
  finalText: string;
  steps: number;
  terminalCall?: {
    name: string;
    args: Record<string, unknown>;
    response: unknown;
  };
  success: boolean;
};

export type Logger = (
  message: string,
  eventType: EventType,
  displayedSummary?: boolean,
) => Promise<void>;

export type AiCallResponse = {
  functionCalls?: any[];
  text?: string;
};

export type AiCallFn = (
  request: unknown,
  options: {
    tools?: Tool[];
    model?: string;
    toolCallingMode?: FunctionCallingConfigMode;
    systemInstruction?: string;
  },
) => Promise<AiCallResponse>;

export type TokenPersistence = {
  repository: Pick<GenTokensRepository, "persistGenTokens">;
  sessionId: string;
  model: string;
};

export type RunToolLoopOptions = {
  initialContents: any[];
  tools: Tool[];
  workspaceRoot: string;
  maxSteps?: number;
  toolCallingMode?: FunctionCallingConfigMode;
  terminalToolNames?: string[];
  keepFullTrace?: boolean;
  contextPolicy?: ToolLoopContextPolicy;
  aiCall: AiCallFn;
  logger: Logger;
  aiCallAutoRetryMax?: number;
  aiCallAutoRetryBaseMs?: number;
  aiCallAutoRetryMaxMs?: number;
  persistResponse?: (modelInput: any, modelOutput: any) => Promise<void>;
  tokenPersistence?: TokenPersistence;
};
