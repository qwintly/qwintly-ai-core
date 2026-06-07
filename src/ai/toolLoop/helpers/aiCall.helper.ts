import { FunctionCallingConfigMode, Tool } from "@google/genai";
import { EVENT_TYPES } from "../../../types/events.js";
import { computeBackoffMs, sleep } from "../../../utils/utils.js";
import { isTransientAiCallError } from "./errors.helper.js";
import { AiCallFn, Logger } from "../toolLoopRunner.js";

export const aiCallWithRetry = async (params: {
  aiCall: AiCallFn;
  request: unknown;
  options: { tools?: Tool[]; toolCallingMode?: FunctionCallingConfigMode };
  retryMax: number;
  retryBaseMs: number;
  retryMaxMs: number;
  step: number;
  logger: Logger;
}) => {
  const {
    aiCall,
    request,
    options,
    retryMax,
    retryBaseMs,
    retryMaxMs,
    logger,
  } = params;

  let retryCount = 0;
  while (true) {
    try {
      return await aiCall(request, options);
    } catch (err) {
      const transient = isTransientAiCallError(err);
      if (!transient || retryMax <= 0 || retryCount >= retryMax) {
        throw err;
      }

      retryCount += 1;
      const delayMs = computeBackoffMs(retryCount, retryBaseMs, retryMaxMs);
      logger("Tool loop: aiCall failed; retrying", EVENT_TYPES.STEP_RETRY);
      await sleep(delayMs);
    }
  }
};
