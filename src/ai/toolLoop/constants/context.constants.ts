import { ToolLoopContextPolicy } from "../types/context.types.js";

export const DEFAULT_CONTEXT_POLICY: Required<ToolLoopContextPolicy> = {
  readFileDefaultMaxLines: 200,
  logApproxModelChars: false,
};

export const TOKEN_LIMIT = 15000;
export const MSG_LIMIT = 12;
