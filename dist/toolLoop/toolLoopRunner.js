import { FunctionCallingConfigMode } from "@google/genai";
import { compactForModel, DEFAULT_CONTEXT_POLICY, normalizeReadFileArgs, redactFunctionCallArgs, } from "./toolLoopContext.js";
import { buildToolStatusMessage, aiCallWithRetry, recordToolEvent, serializeError, } from "./toolLoopRunnerUtils.js";
export async function runToolLoop(options) {
    const { initialContents, tools, handlers, maxSteps = 30, model, toolCallingMode = FunctionCallingConfigMode.ANY, terminalToolNames = [], keepFullTrace = true, contextPolicy, aiCall, logger, applyPatchAutoRetryMax = 2, aiCallAutoRetryMax = 3, // must have it to try 3 times as gemini errors a lot due to high demand sometimes
    aiCallAutoRetryBaseMs = 400, aiCallAutoRetryMaxMs = 10000, } = options;
    if (typeof aiCall !== "function") {
        throw new Error("Tool loop: aiCall is required.");
    }
    const policy = {
        ...DEFAULT_CONTEXT_POLICY,
        ...(contextPolicy ?? {}),
    };
    const toolEvents = [];
    let applyPatchRetryCount = 0;
    const fullTraceContents = keepFullTrace ? [...initialContents] : [];
    let modelContents = [...initialContents];
    const pushBoth = (fullItem, modelItem) => {
        if (keepFullTrace)
            fullTraceContents.push(fullItem);
        modelContents.push(modelItem);
    };
    const pushModelOnly = (modelItem) => {
        modelContents.push(modelItem);
    };
    for (let step = 0; step < maxSteps; step++) {
        modelContents = compactForModel({
            initialCount: initialContents.length,
            modelContents,
            toolEvents,
            policy,
        });
        if (policy.logApproxModelChars) {
            const approxChars = JSON.stringify(modelContents).length;
            logger?.info?.("Tool loop: approx model chars", {
                approxChars,
                step: step + 1,
            });
        }
        let response;
        response = await aiCallWithRetry({
            aiCall,
            request: modelContents,
            options: { tools, model, toolCallingMode },
            retryMax: aiCallAutoRetryMax,
            retryBaseMs: aiCallAutoRetryBaseMs,
            retryMaxMs: aiCallAutoRetryMaxMs,
            step: step + 1,
            logger,
        });
        const functionCalls = response.functionCalls ?? [];
        if (functionCalls.length === 0) {
            return {
                contents: keepFullTrace ? fullTraceContents : modelContents,
                modelContents,
                finalText: (response.text ?? "").trim(),
                steps: step + 1,
            };
        }
        for (const call of functionCalls) {
            const name = call.name?.toString() ?? "";
            const args = (call.args ?? {});
            if (!name) {
                throw new Error("Tool loop: function call missing name.");
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
            let effectiveArgs = args;
            let readFileMeta = null;
            if (name === "read_file") {
                const normalized = normalizeReadFileArgs(effectiveArgs, policy.readFileDefaultMaxLines);
                effectiveArgs = normalized.effectiveArgs;
                readFileMeta = {
                    start: normalized.start,
                    end: normalized.end,
                    wasCapped: normalized.wasCapped,
                };
            }
            // User-facing status ping for every tool call (kept intentionally non-sensitive).
            logger?.status?.(buildToolStatusMessage(name, effectiveArgs, readFileMeta), {
                tool: name,
                step: step + 1,
            });
            const modelArgs = redactFunctionCallArgs(name, effectiveArgs);
            const assistantFull = {
                role: "model",
                parts: [
                    {
                        functionCall: {
                            name,
                            args: effectiveArgs,
                        },
                    },
                ],
            };
            const assistantModel = {
                role: "model",
                parts: [
                    {
                        functionCall: {
                            name,
                            args: modelArgs,
                        },
                    },
                ],
            };
            if (keepFullTrace) {
                pushBoth(assistantFull, assistantModel);
            }
            else {
                pushModelOnly(assistantModel);
            }
            let toolResultRaw;
            if (handlerMissingResult) {
                toolResultRaw = handlerMissingResult;
            }
            else {
                try {
                    toolResultRaw = await handler(effectiveArgs);
                }
                catch (err) {
                    logger?.status?.(`AI tool: ${name} failed`, {
                        tool: name,
                        step: step + 1,
                    });
                    logger?.error?.("Tool loop: handler threw", err, {
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
            let toolResult = toolResultRaw;
            if (name === "read_file" && readFileMeta) {
                const path = String(effectiveArgs.path ?? "");
                const rawContent = typeof toolResultRaw?.content === "string"
                    ? String(toolResultRaw.content)
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
            if (name === "apply_patch" &&
                toolResult?.success === false &&
                applyPatchAutoRetryMax > 0 &&
                applyPatchRetryCount < applyPatchAutoRetryMax) {
                applyPatchRetryCount += 1;
                const error = String(toolResult?.error ?? "unknown error");
                const debugFiles = Array.isArray(toolResult?.debug?.files)
                    ? toolResult.debug.files
                    : [];
                const debugText = debugFiles.length > 0
                    ? `\n\nFILE SNAPSHOTS (for regenerating the patch):\n${debugFiles
                        .slice(0, 3)
                        .map((f) => `--- ${String(f.path ?? "")} ---\n${String(f.head ?? "")}\n--- end ---`)
                        .join("\n\n")}`
                    : "";
                const retryInstruction = {
                    role: "user",
                    parts: [
                        {
                            text: `apply_patch failed (attempt ${applyPatchRetryCount}/${applyPatchAutoRetryMax}): ${error}\n` +
                                `Regenerate a patch that matches the current file contents. ` +
                                `For large rewrites, prefer write_file(path, content) or Delete+Add instead of Update.` +
                                debugText,
                        },
                    ],
                };
                if (keepFullTrace)
                    fullTraceContents.push(retryInstruction);
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
    throw new Error(`Tool loop: max steps reached (${maxSteps}).`);
}
//# sourceMappingURL=toolLoopRunner.js.map