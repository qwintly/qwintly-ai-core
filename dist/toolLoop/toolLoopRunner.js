import { FunctionCallingConfigMode } from "@google/genai";
import { compactForModel, DEFAULT_CONTEXT_POLICY, getApplyPatchEventMeta, normalizeReadFileArgs, redactFunctionCallArgs, } from "./toolLoopContext.js";
export async function runToolLoop(options) {
    const { initialContents, tools, handlers, maxSteps = 30, model, toolCallingMode = FunctionCallingConfigMode.ANY, terminalToolNames = [], keepFullTrace = true, contextPolicy, aiCall, logger, applyPatchAutoRetryMax = 0, } = options;
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
            logger?.info?.(`Tool loop: approx model chars=${approxChars} step=${step + 1}`);
        }
        const response = await aiCall(modelContents, {
            tools,
            model,
            toolCallingMode,
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
            if (!handler) {
                throw new Error(`Tool loop: no handler registered for "${name}".`);
            }
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
            const toolResultRaw = await handler(effectiveArgs);
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
            try {
                if (name === "read_file") {
                    const path = String(effectiveArgs.path ?? "");
                    const start = readFileMeta?.start ?? Number(effectiveArgs.start_line ?? 1);
                    const end = readFileMeta?.end ?? Number(effectiveArgs.end_line ?? start);
                    toolEvents.push({
                        name,
                        summary: `read_file ${path}:${start}-${end}${readFileMeta?.wasCapped ? " (capped)" : ""}`,
                    });
                }
                else if (name === "apply_patch") {
                    const meta = typeof modelArgs.patch_string === "object"
                        ? modelArgs.patch_string
                        : null;
                    const fallback = getApplyPatchEventMeta(effectiveArgs);
                    const ok = toolResult?.success === true
                        ? "success"
                        : toolResult?.success === false
                            ? "failure"
                            : "done";
                    toolEvents.push({
                        name,
                        summary: `apply_patch files=${JSON.stringify(meta?.files ?? fallback.files)} sha256=${String(meta?.sha256 ?? fallback.sha256).slice(0, 12)} chars=${meta?.chars ?? fallback.chars} result=${ok}`,
                    });
                }
                else if (name === "search") {
                    const q = String(effectiveArgs.search_query ?? "").trim();
                    const results = Array.isArray(toolResultRaw?.results)
                        ? toolResultRaw.results
                        : [];
                    toolEvents.push({
                        name,
                        summary: `search "${q}" -> ${results.length} results`,
                    });
                }
                else if (name === "list_dir") {
                    const p = String(effectiveArgs.path ?? "");
                    const d = Number(effectiveArgs.depth ?? 1);
                    toolEvents.push({ name, summary: `list_dir ${p} depth=${d}` });
                }
                else if (name === "create_file") {
                    const p = String(effectiveArgs.path ?? "");
                    toolEvents.push({ name, summary: `create_file ${p}` });
                }
                else if (name === "delete_file") {
                    const p = String(effectiveArgs.path ?? "");
                    toolEvents.push({ name, summary: `delete_file ${p}` });
                }
                else {
                    toolEvents.push({ name, summary: `${name} called` });
                }
            }
            catch {
                toolEvents.push({ name, summary: `${name} called` });
            }
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