import { FunctionCallingConfigMode, Tool } from "@google/genai";
import type { GenTokensRepository } from "../../repository/genTokens.repository.js";
import { persistToolCall } from "../../services/toolcallPersist.service.js";
import { EVENT_TYPES, EventType } from "../../types/events.js";
import { STYLE_TOKEN_KEYS } from "../../types/styleConfig.js";
import { createWorkspaceToolImpls } from "../tools/implementations/factories.js";
import { aiCallWithRetry } from "./helpers/aiCall.helper.js";
import { serializeError } from "./helpers/errors.helper.js";
import { nodeFs } from "./helpers/fsHelpers.js";
import { handleApplyPatchFailure } from "./helpers/patchRetry.helper.js";
import {
  extractUsageTokenCounts,
  persistTokensOnce,
} from "./helpers/persistTokens.helpers.js";
import { extractThoughtSignatures } from "./helpers/signatures.helper.js";
import { normalizeToolArgs } from "./helpers/toolArgs.helper.js";
import {
  executeToolHandler,
  postProcessToolResult,
} from "./helpers/toolExecution.helper.js";
import { createToolHandlers } from "./helpers/toolHandlers.helper.js";
import { recordToolEvent } from "./toolEventSummary.js";
import {
  compactForModel,
  DEFAULT_CONTEXT_POLICY,
  redactFunctionCallArgs,
  ToolEvent,
  ToolLoopContextPolicy,
} from "./toolLoopContext.js";
import { buildToolStatusMessage } from "./toolStatusMessage.js";

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
  applyPatchAutoRetryMax?: number;
  aiCallAutoRetryMax?: number;
  aiCallAutoRetryBaseMs?: number;
  aiCallAutoRetryMaxMs?: number;
  persistResponse?: (modelInput: any, modelOutput: any) => Promise<void>;
  tokenPersistence?: TokenPersistence;
};

export async function runToolLoop(
  options: RunToolLoopOptions,
): Promise<ToolLoopResult> {
  const styleTokenKeySet = new Set<string>(
    STYLE_TOKEN_KEYS as unknown as string[],
  );

  const {
    initialContents,
    tools,
    workspaceRoot,
    maxSteps = 30,
    toolCallingMode = FunctionCallingConfigMode.ANY,
    terminalToolNames = [],
    keepFullTrace = true,
    contextPolicy,
    aiCall,
    logger,
    applyPatchAutoRetryMax = 2,
    aiCallAutoRetryMax = 3, // must have it to try 3 times as gemini errors a lot due to high demand sometimes
    aiCallAutoRetryBaseMs = 400,
    aiCallAutoRetryMaxMs = 10_000,
    persistResponse,
    tokenPersistence,
  } = options;

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let sawAnyTokenUsage = false;

  const impls = createWorkspaceToolImpls({
    workspaceRoot,
    fs: nodeFs,
  });

  const toolHandlers = createToolHandlers({
    impls,
    workspaceRoot,
  });

  if (typeof aiCall !== "function") {
    throw new Error("Tool loop: aiCall is required.");
  }

  const policy: Required<ToolLoopContextPolicy> = {
    ...DEFAULT_CONTEXT_POLICY,
    ...(contextPolicy ?? {}),
  };

  const toolEvents: ToolEvent[] = [];
  let applyPatchRetryCount = 0;

  const EXECUTION_GUIDE_MARKER = "TOOL_LOOP_EXECUTION_GUIDE_V1";
  const executionGuideInstruction = {
    role: "user",
    parts: [
      {
        text:
          `${EXECUTION_GUIDE_MARKER}\n` +
          `Execution limit: At most ${maxSteps} assistant turn(s) in this tool loop. ` +
          `One turn = one assistant response in the tool loop.\n` +
          `Complete the task in as few turns as possible and avoid unnecessary actions. Prioritize correctness.`,
      },
    ],
  };

  const fullTraceContents: any[] = keepFullTrace
    ? [...initialContents, executionGuideInstruction]
    : [];
  let modelContents: any[] = [...initialContents, executionGuideInstruction];
  const pinnedInitialCount = initialContents.length + 1;
  const pushBoth = (fullItem: any, modelItem: any) => {
    if (keepFullTrace) fullTraceContents.push(fullItem);
    modelContents.push(modelItem);
  };
  const pushModelOnly = (modelItem: any) => {
    modelContents.push(modelItem);
  };

  for (let step = 0; step < maxSteps; step++) {
    modelContents = compactForModel({
      initialCount: pinnedInitialCount,
      modelContents,
      toolEvents,
      policy,
    });

    if (policy.logApproxModelChars) {
      const approxChars = JSON.stringify(modelContents).length;
      console.log("Tool loop: approx model chars", {
        approxChars,
        step: step + 1,
      });
    }

    let response: Awaited<ReturnType<AiCallFn>>;
    try {
      response = await aiCallWithRetry({
        aiCall,
        request: modelContents,
        options: { tools, toolCallingMode },
        retryMax: aiCallAutoRetryMax,
        retryBaseMs: aiCallAutoRetryBaseMs,
        retryMaxMs: aiCallAutoRetryMaxMs,
        step: step + 1,
        logger,
      });
    } catch (err) {
      logger(
        "Tool loop: AI provider error; preserving context and continuing",
        EVENT_TYPES.STEP_ERROR,
      );
      console.error("Tool loop: aiCall failed (provider/server side)", err, {
        step: step + 1,
        error: serializeError(err),
      });

      const message =
        err instanceof Error ? err.message : JSON.stringify(err ?? null);
      const providerErrorInstruction = {
        role: "user",
        parts: [
          {
            text:
              `AI provider error (server-side). Do NOT clear or restart context; continue from the existing conversation state.\n` +
              `Error: ${message}\n` +
              `Next: retry the last request using the same context. If you were about to call tools, resend a valid tool call.`,
          },
        ],
      };
      if (keepFullTrace) fullTraceContents.push(providerErrorInstruction);
      continue;
    }

    if (persistResponse) {
      try {
        await persistResponse(modelContents, response);
      } catch (err) {
        console.error("Tool loop: failed to persist response", err, {
          step: step + 1,
        });
      }
    }

    {
      const usage = extractUsageTokenCounts(response);
      if (usage) {
        sawAnyTokenUsage = true;
        totalInputTokens += usage.inputTokens;
        totalOutputTokens += usage.outputTokens;
      }
    }

    const functionCalls = response.functionCalls ?? [];
    if (functionCalls.length === 0) {
      await persistTokensOnce(
        tokenPersistence,
        sawAnyTokenUsage,
        totalInputTokens,
        totalOutputTokens,
      );
      return {
        contents: keepFullTrace ? fullTraceContents : modelContents,
        modelContents,
        finalText: (response.text ?? "").trim(),
        steps: step + 1,
      };
    }

    const signatureById = extractThoughtSignatures(response);

    for (let callIndex = 0; callIndex < functionCalls.length; callIndex++) {
      const call = functionCalls[callIndex];
      const name = call.name?.toString() ?? "";
      const args = (call.args ?? {}) as Record<string, unknown>;
      const thoughtSignature: string | undefined = (() => {
        const direct =
          (call as any)?.thought_signature ?? (call as any)?.thoughtSignature;
        if (typeof direct === "string" && direct) return direct;
        const id = (call as any)?.id;
        if (typeof id === "string" && signatureById.has(id)) {
          return signatureById.get(id);
        }
        return undefined;
      })();

      if (!name) {
        logger(
          "Tool loop: malformed function call from model; preserving context and continuing",
          EVENT_TYPES.STEP_ERROR,
        );
        const malformedInstruction = {
          role: "user",
          parts: [
            {
              text:
                `Malformed function call received (missing tool name). Do NOT clear or restart context.\n` +
                `Resend a single valid tool call with a non-empty name and JSON args.\n` +
                `Bad call: ${JSON.stringify(call ?? null).slice(0, 1500)}`,
            },
          ],
        };
        if (keepFullTrace) fullTraceContents.push(malformedInstruction);
        modelContents.push(malformedInstruction);
        continue;
      }

      const handler = toolHandlers[name];

      const { effectiveArgs, readFileMeta } = normalizeToolArgs(
        name,
        args,
        {
          readFileDefaultMaxLines: policy.readFileDefaultMaxLines,
          styleTokenKeySet,
        }
      );

      logger(
        buildToolStatusMessage(name, effectiveArgs, readFileMeta),
        EVENT_TYPES.STEP_STARTED,
        true,
      );

      const modelArgs = redactFunctionCallArgs(name, effectiveArgs);

      const functionCallPart = {
        functionCall: {
          name,
          args: effectiveArgs,
        },
        ...(thoughtSignature
          ? {
              thoughtSignature: thoughtSignature,
              thought_signature: thoughtSignature,
            }
          : {}),
      };

      const functionCallPartModel = {
        functionCall: {
          name,
          args: modelArgs,
        },
        ...(thoughtSignature
          ? {
              thoughtSignature: thoughtSignature,
              thought_signature: thoughtSignature,
            }
          : {}),
      };

      const assistantFull = {
        role: "model",
        parts: [
          {
            ...functionCallPart,
          },
        ],
      };

      const assistantModel = {
        role: "model",
        parts: [
          {
            ...functionCallPartModel,
          },
        ],
      };

      if (keepFullTrace) {
        pushBoth(assistantFull, assistantModel);
      } else {
        pushModelOnly(assistantModel);
      }

      const toolResultRaw = await executeToolHandler({
        name,
        handler,
        effectiveArgs,
        styleTokenKeySet,
        step: step + 1,
        logger,
      });

      const toolResult = postProcessToolResult({
        name,
        toolResultRaw,
        effectiveArgs,
        readFileMeta,
        readFileDefaultMaxLines: policy.readFileDefaultMaxLines,
      });

      try {
        await persistToolCall(name, modelArgs, toolResult);
      } catch (err) {
        console.error("Tool loop: failed to persist tool call", err, {
          tool: name,
          step: step + 1,
        });
      }

      const responseFull = {
        role: "user",
        parts: [
          {
            functionResponse: {
              name,
              response: toolResult,
            },
          },
        ],
      };

      if (keepFullTrace) {
        fullTraceContents.push(responseFull);
      }
      modelContents.push(responseFull);

      if (
        name === "apply_patch" &&
        (toolResult as any)?.success === false &&
        applyPatchAutoRetryMax > 0 &&
        applyPatchRetryCount < applyPatchAutoRetryMax
      ) {
        const failureResult = handleApplyPatchFailure({
          toolResult,
          applyPatchAutoRetryMax,
          applyPatchRetryCount,
          keepFullTrace,
          fullTraceContents,
          modelContents,
        });
        applyPatchRetryCount = failureResult.applyPatchRetryCount;
      }

      recordToolEvent({
        toolEvents,
        name,
        effectiveArgs,
        modelArgs,
        readFileMeta,
        toolResult,
        toolResultRaw,
      });

      if (terminalToolNames.includes(name)) {
        await persistTokensOnce(
          tokenPersistence,
          sawAnyTokenUsage,
          totalInputTokens,
          totalOutputTokens,
        );
        return {
          contents: keepFullTrace ? fullTraceContents : modelContents,
          modelContents,
          finalText: "",
          steps: step + 1,
          terminalCall: { name, args: effectiveArgs, response: toolResultRaw },
        };
      }
    }
  }

  await persistTokensOnce(
    tokenPersistence,
    sawAnyTokenUsage,
    totalInputTokens,
    totalOutputTokens,
  );
  return {
    contents: keepFullTrace ? fullTraceContents : modelContents,
    modelContents,
    finalText: `Stopped: max steps reached (${maxSteps}).`,
    steps: maxSteps,
  };
}
