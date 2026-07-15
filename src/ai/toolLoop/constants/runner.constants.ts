import { FunctionCallingConfigMode } from "@google/genai";

export const EXECUTION_GUIDE_MARKER = "TOOL_LOOP_EXECUTION_GUIDE_V1";

export const DEFAULT_MAX_STEPS = 30;
export const DEFAULT_TOOL_CALLING_MODE = FunctionCallingConfigMode.ANY;
export const DEFAULT_KEEP_FULL_TRACE = true;
export const DEFAULT_AI_CALL_AUTO_RETRY_MAX = 3;
export const DEFAULT_AI_CALL_AUTO_RETRY_BASE_MS = 400;
export const DEFAULT_AI_CALL_AUTO_RETRY_MAX_MS = 10_000;
