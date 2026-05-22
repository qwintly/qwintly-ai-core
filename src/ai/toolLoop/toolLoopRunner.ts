import { FunctionCallingConfigMode, Tool } from "@google/genai";
import { persistToolCall } from "../../services/toolcallPersist.service.js";
import { EVENT_TYPES, EventType } from "../../types/events.js";
import {
  compactForModel,
  DEFAULT_CONTEXT_POLICY,
  normalizeReadFileArgs,
  redactFunctionCallArgs,
  ToolEvent,
  ToolLoopContextPolicy,
} from "./toolLoopContext.js";
import {
  aiCallWithRetry,
  buildToolStatusMessage,
  recordToolEvent,
  serializeError,
} from "./toolLoopRunnerUtils.js";

export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

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

export type Logger = (message: string, eventType: EventType) => Promise<void>;

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

export type RunToolLoopOptions = {
  initialContents: any[];
  tools: Tool[];
  handlers: Record<string, ToolHandler>;
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
};

export async function runToolLoop(
  options: RunToolLoopOptions,
): Promise<ToolLoopResult> {
  const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

  const {
    initialContents,
    tools,
    handlers,
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
  } = options;

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

    const functionCalls = response.functionCalls ?? [];
    if (functionCalls.length === 0) {
      return {
        contents: keepFullTrace ? fullTraceContents : modelContents,
        modelContents,
        finalText: (response.text ?? "").trim(),
        steps: step + 1,
      };
    }

    const signatureById = (() => {
      try {
        const candidates = Array.isArray((response as any)?.candidates)
          ? ((response as any).candidates as any[])
          : [];
        const parts = candidates?.[0]?.content?.parts;
        const arr = Array.isArray(parts) ? (parts as any[]) : [];
        const map = new Map<string, string>();
        for (const p of arr) {
          const fc = p?.functionCall;
          const id = fc?.id;
          const sig = p?.thoughtSignature ?? p?.thought_signature;
          if (typeof id === "string" && typeof sig === "string" && sig) {
            map.set(id, sig);
          }
        }
        return map;
      } catch {
        return new Map<string, string>();
      }
    })();

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

      const handler = handlers[name];
      const handlerMissingResult = !handler
        ? {
            success: false,
            error: `No handler registered for "${name}".`,
            error_detail: {
              name: "MissingToolHandlerError",
              message: `No handler registered for "${name}".`,
            },
          }
        : null;

      let effectiveArgs: Record<string, unknown> = args;
      let readFileMeta: {
        start: number;
        end: number;
        wasCapped: boolean;
      } | null = null;
      if (name === "read_file") {
        const normalized = normalizeReadFileArgs(
          effectiveArgs,
          policy.readFileDefaultMaxLines,
        );
        effectiveArgs = normalized.effectiveArgs;
        readFileMeta = {
          start: normalized.start,
          end: normalized.end,
          wasCapped: normalized.wasCapped,
        };
      }

      logger(
        buildToolStatusMessage(name, effectiveArgs, readFileMeta),
        EVENT_TYPES.STEP_STARTED,
      );

      const modelArgs = redactFunctionCallArgs(name, effectiveArgs);

      const functionCallPart = {
        functionCall: {
          name,
          args: effectiveArgs,
        },
        ...(thoughtSignature
          ? { thoughtSignature: thoughtSignature, thought_signature: thoughtSignature }
          : {}),
      };

      const functionCallPartModel = {
        functionCall: {
          name,
          args: modelArgs,
        },
        ...(thoughtSignature
          ? { thoughtSignature: thoughtSignature, thought_signature: thoughtSignature }
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

      let toolResultRaw: unknown;
      if (handlerMissingResult) {
        toolResultRaw = handlerMissingResult;
      } else {
        try {
          if (name === "update_global_styles") {
            const tokens = (effectiveArgs as any)?.tokens;
            if (isPlainObject(tokens) && Object.keys(tokens).length === 0) {
              toolResultRaw = {
                success: false,
                error: "tokens patch must not be empty",
                error_detail: {
                  name: "InvalidToolArgumentsError",
                  message:
                    "update_global_styles requires at least one token key/value (e.g. { tokens: { radius: \"0.75rem\" } }).",
                },
                note: "Resend update_global_styles with at least one token key/value, or skip this tool call.",
              };
            } else {
              toolResultRaw = await handler(effectiveArgs);
            }
          } else {
            toolResultRaw = await handler(effectiveArgs);
          }
        } catch (err) {
          logger(`AI tool: ${name} failed`, EVENT_TYPES.STEP_ERROR);
          console.error("Tool loop: handler threw", err, {
            tool: name,
            step: step + 1,
          });
          toolResultRaw = {
            success: false,
            error: err instanceof Error ? err.message : String(err),
            error_detail: serializeError(err),
            note: "Tool handler threw. Inspect error_detail and retry with corrected args or a different approach.",
          };
        }
      }
      let toolResult: unknown = toolResultRaw;

      if (name === "read_file" && readFileMeta) {
        const path = String(effectiveArgs.path ?? "");

        const jsonPayload =
          (toolResultRaw as any)?.kind === "json"
            ? (toolResultRaw as any)?.json
            : undefined;
        if (jsonPayload !== undefined) {
          // Token-efficient: return JSON as structured data (no double-stringifying).
          toolResult = { path, json: jsonPayload };
        } else {
          const rawContent =
            typeof (toolResultRaw as any)?.content === "string"
              ? String((toolResultRaw as any).content)
              : typeof toolResultRaw === "string"
                ? toolResultRaw
                : JSON.stringify(toolResultRaw ?? null);

          toolResult = {
            path,
            start_line: readFileMeta.start,
            end_line: readFileMeta.end,
            truncated: readFileMeta.wasCapped,
            content: rawContent,
            note: readFileMeta.wasCapped
              ? `Capped to ${policy.readFileDefaultMaxLines} lines. Request more with start_line/end_line.`
              : undefined,
          };
        }
      }

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
        applyPatchRetryCount += 1;

        const error = String((toolResult as any)?.error ?? "unknown error");
        const debugFiles = Array.isArray((toolResult as any)?.debug?.files)
          ? ((toolResult as any).debug.files as Array<{
              path?: string;
              head?: string;
            }>)
          : [];

        const debugText =
          debugFiles.length > 0
            ? `\n\nFILE SNAPSHOTS (for regenerating the patch):\n${debugFiles
                .slice(0, 3)
                .map(
                  (f) =>
                    `--- ${String(f.path ?? "")} ---\n${String(
                      f.head ?? "",
                    )}\n--- end ---`,
                )
                .join("\n\n")}`
            : "";

        const retryInstruction = {
          role: "user",
          parts: [
            {
              text:
                `apply_patch failed (attempt ${applyPatchRetryCount}/${applyPatchAutoRetryMax}): ${error}\n` +
                `Regenerate a patch that matches the current file contents. ` +
                `For large rewrites, prefer write_file(path, content) or Delete+Add instead of Update.` +
                debugText,
            },
          ],
        };

        if (keepFullTrace) fullTraceContents.push(retryInstruction);
        modelContents.push(retryInstruction);
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

  return {
    contents: keepFullTrace ? fullTraceContents : modelContents,
    modelContents,
    finalText: `Stopped: max steps reached (${maxSteps}).`,
    steps: maxSteps,
  };
}
