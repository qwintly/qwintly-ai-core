import { FunctionCallingConfigMode, Tool } from "@google/genai";
import { EVENT_TYPES } from "../../types/events.js";
import { getApplyPatchEventMeta, ToolEvent } from "./toolLoopContext.js";
import { AiCallFn, Logger } from "./toolLoopRunner.js";

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, ms)));

export const serializeError = (err: unknown) => {
  if (err instanceof Error) {
    const cause = (err as any).cause as unknown;
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      cause:
        cause instanceof Error
          ? {
              name: cause.name,
              message: cause.message,
              stack: cause.stack,
            }
          : cause,
    };
  }

  return {
    name: typeof err,
    message: typeof err === "string" ? err : "Non-Error thrown",
    value: err,
  };
};

export const isTransientAiCallError = (err: unknown) => {
  let cur: any = err as any;
  for (let depth = 0; depth < 4 && cur; depth++) {
    const code =
      cur?.error?.code ?? cur?.code ?? cur?.statusCode ?? cur?.response?.status;

    const status =
      cur?.error?.status ?? cur?.status ?? cur?.response?.data?.error?.status;

    const message =
      cur?.error?.message ?? cur?.message ?? cur?.response?.data?.error?.message;

    const msg = typeof message === "string" ? message.toLowerCase() : "";
    const stat = typeof status === "string" ? status.toUpperCase() : "";

    if (code === 503) return true;
    if (code === 429) return true;
    if (stat === "UNAVAILABLE") return true;
    if (stat === "RESOURCE_EXHAUSTED") return true;
    if (msg.includes("high demand")) return true;
    if (msg.includes("try again later")) return true;
    if (msg.includes("temporar")) return true;

    cur = cur?.cause;
  }

  return false;
};

export const computeBackoffMs = (
  attempt: number,
  baseMs: number,
  maxMs: number,
) => {
  const exp = baseMs * Math.pow(2, Math.max(0, attempt - 1));
  const capped = Math.min(maxMs, exp);
  const jitter = capped * (0.2 * Math.random());
  return Math.round(capped + jitter);
};

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

export const buildToolStatusMessage = (
  name: string,
  effectiveArgs: Record<string, unknown>,
  readFileMeta: { start: number; end: number; wasCapped: boolean } | null,
) => {
  if (name === "read_file" && readFileMeta) {
    return `AI tool: read_file (${readFileMeta.start}-${readFileMeta.end}${
      readFileMeta.wasCapped ? ", capped" : ""
    })`;
  }

  if (name === "apply_patch") {
    const meta = getApplyPatchEventMeta(effectiveArgs);
    const files = Array.isArray(meta.files) ? meta.files.length : 0;
    return `AI tool: apply_patch (${files} file${files === 1 ? "" : "s"})`;
  }

  if (name === "search") return "AI tool: search";
  if (name === "list_dir") return "AI tool: list_dir";
  if (name === "write_file") return "AI tool: write_file";
  if (name === "submit_planner_tasks") return "AI tool: submit_planner_tasks";
  if (name === "submit_codegen_done") return "AI tool: submit_codegen_done";

  return `AI tool: ${name}`;
};

export const recordToolEvent = (params: {
  toolEvents: ToolEvent[];
  name: string;
  effectiveArgs: Record<string, unknown>;
  modelArgs: Record<string, unknown>;
  readFileMeta: { start: number; end: number; wasCapped: boolean } | null;
  toolResult: unknown;
  toolResultRaw: unknown;
}) => {
  const oneLine = (value: unknown, maxLen = 140) => {
    const raw =
      typeof value === "string"
        ? value
        : value === undefined
          ? ""
          : value === null
            ? "null"
            : JSON.stringify(value);
    const collapsed = raw.replace(/\s+/g, " ").trim();
    if (collapsed.length <= maxLen) return collapsed;
    return `${collapsed.slice(0, Math.max(0, maxLen - 1))}…`;
  };

  const getStringArg = (key: string) => oneLine(params.effectiveArgs[key] ?? "");

  const {
    toolEvents,
    name,
    effectiveArgs,
    modelArgs,
    readFileMeta,
    toolResult,
    toolResultRaw,
  } = params;

  try {
    if (name === "read_file") {
      const path = String(effectiveArgs.path ?? "");
      const start =
        readFileMeta?.start ?? Number(effectiveArgs.start_line ?? 1);
      const end = readFileMeta?.end ?? Number(effectiveArgs.end_line ?? start);
      toolEvents.push({
        name,
        summary: `read_file ${path}:${start}-${end}${readFileMeta?.wasCapped ? " (capped)" : ""}`,
      });
      return;
    }

    if (name === "apply_patch") {
      const meta =
        typeof (modelArgs as any).patch_string === "object"
          ? ((modelArgs as any).patch_string as any)
          : null;
      const fallback = getApplyPatchEventMeta(effectiveArgs);
      const ok =
        (toolResult as any)?.success === true
          ? "success"
          : (toolResult as any)?.success === false
            ? "failure"
            : "done";
      toolEvents.push({
        name,
        summary: `apply_patch files=${JSON.stringify(meta?.files ?? fallback.files)} sha256=${String(meta?.sha256 ?? fallback.sha256).slice(0, 12)} chars=${meta?.chars ?? fallback.chars} result=${ok}`,
      });
      return;
    }

    if (name === "create_new_route") {
      const parentRoute = getStringArg("parent_route") || "/";
      const routeName = getStringArg("route_name");
      const successVal = (toolResult as any)?.success;
      if (typeof successVal === "boolean") {
        const route = oneLine((toolResult as any)?.route ?? "");
        const createdFiles = Array.isArray((toolResult as any)?.created_files)
          ? ((toolResult as any).created_files as unknown[])
          : [];
        const filesText =
          successVal === true
            ? ` created_files=${createdFiles.length}`
            : "";
        const routeText = route ? ` route=${route}` : "";
        const errText =
          successVal === false
            ? ` error=${oneLine((toolResult as any)?.error ?? "unknown", 160)}`
            : "";
        toolEvents.push({
          name,
          summary: `create_new_route ${successVal ? "success" : "failure"} parent_route=${parentRoute} route_name=${routeName}${routeText}${filesText}${errText}`,
        });
        return;
      }
    }

    if (name === "insert_element") {
      const route = getStringArg("route");
      const parentId = getStringArg("parent_id");
      const beforeId = getStringArg("before_id");
      const successVal = (toolResult as any)?.success;
      if (typeof successVal === "boolean") {
        const insertedId = oneLine((toolResult as any)?.inserted_id ?? "");
        const changedVal = (toolResult as any)?.changed;
        const changedText =
          typeof changedVal === "boolean" ? ` changed=${changedVal}` : "";
        const beforeText = beforeId ? ` before_id=${beforeId}` : "";
        const insertedText = insertedId ? ` inserted_id=${insertedId}` : "";
        const errText =
          successVal === false
            ? ` error=${oneLine((toolResult as any)?.error ?? "unknown", 160)}`
            : "";
        toolEvents.push({
          name,
          summary: `insert_element ${successVal ? "success" : "failure"} route=${route} parent_id=${parentId}${beforeText}${insertedText}${changedText}${errText}`,
        });
        return;
      }
    }

    if (name === "update_classname") {
      const route = getStringArg("route");
      const elementId = getStringArg("element_id");
      const className = oneLine(effectiveArgs.className ?? "", 160);
      const successVal = (toolResult as any)?.success;
      if (typeof successVal === "boolean") {
        const changedVal = (toolResult as any)?.changed;
        const changedText =
          typeof changedVal === "boolean" ? ` changed=${changedVal}` : "";
        const updatedId = oneLine((toolResult as any)?.updated_id ?? "");
        const updatedText = updatedId ? ` updated_id=${updatedId}` : "";
        const errText =
          successVal === false
            ? ` error=${oneLine((toolResult as any)?.error ?? "unknown", 160)}`
            : "";
        toolEvents.push({
          name,
          summary: `update_classname ${successVal ? "success" : "failure"} route=${route} element_id=${elementId} className="${className}"${updatedText}${changedText}${errText}`,
        });
        return;
      }
    }

    if (name === "update_props") {
      const route = getStringArg("route");
      const elementId = getStringArg("element_id");
      const successVal = (toolResult as any)?.success;
      if (typeof successVal === "boolean") {
        const changedVal = (toolResult as any)?.changed;
        const changedText =
          typeof changedVal === "boolean" ? ` changed=${changedVal}` : "";
        const updatedId = oneLine((toolResult as any)?.updated_id ?? "");
        const updatedText = updatedId ? ` updated_id=${updatedId}` : "";
        const patchKeys = Object.keys(effectiveArgs ?? {}).filter((k) => {
          if (k === "route" || k === "element_id") return false;
          const v = (effectiveArgs as any)[k];
          return v !== undefined && v !== null;
        });
        const keysText =
          patchKeys.length > 0
            ? ` keys=${oneLine(patchKeys.sort().join(","), 140)}`
            : "";
        const errText =
          successVal === false
            ? ` error=${oneLine((toolResult as any)?.error ?? "unknown", 160)}`
            : "";
        toolEvents.push({
          name,
          summary: `update_props ${successVal ? "success" : "failure"} route=${route} element_id=${elementId}${keysText}${updatedText}${changedText}${errText}`,
        });
        return;
      }
    }

    if (name === "update_global_styles") {
      const tokens = (effectiveArgs as any)?.tokens;
      const tokenKeys = tokens && typeof tokens === "object" && !Array.isArray(tokens)
        ? Object.keys(tokens as Record<string, unknown>)
        : [];
      const successVal = (toolResult as any)?.success;
      if (typeof successVal === "boolean") {
        const changedVal = (toolResult as any)?.changed;
        const changedText =
          typeof changedVal === "boolean" ? ` changed=${changedVal}` : "";
        const version = (toolResult as any)?.version;
        const versionText =
          typeof version === "number" && Number.isFinite(version)
            ? ` version=${version}`
            : "";
        const created = (toolResult as any)?.created;
        const createdText =
          typeof created === "boolean" ? ` created=${created}` : "";
        const keysText =
          tokenKeys.length > 0
            ? ` tokens=${oneLine(tokenKeys.sort().join(","), 160)}`
            : "";
        const errText =
          successVal === false
            ? ` error=${oneLine((toolResult as any)?.error ?? "unknown", 160)}`
            : "";
        toolEvents.push({
          name,
          summary: `update_global_styles ${successVal ? "success" : "failure"}${keysText}${versionText}${createdText}${changedText}${errText}`,
        });
        return;
      }
    }

    if (name === "search") {
      const q = String(effectiveArgs.search_query ?? "").trim();
      const results = Array.isArray((toolResultRaw as any)?.results)
        ? (toolResultRaw as any).results
        : [];
      toolEvents.push({
        name,
        summary: `search "${q}" -> ${results.length} results`,
      });
      return;
    }

    if (name === "list_dir") {
      const p = String(effectiveArgs.path ?? "");
      const d = Number(effectiveArgs.depth ?? 1);
      toolEvents.push({ name, summary: `list_dir ${p} depth=${d}` });
      return;
    }

    if (name === "create_file") {
      const p = String(effectiveArgs.path ?? "");
      toolEvents.push({ name, summary: `create_file ${p}` });
      return;
    }

    if (name === "delete_file") {
      const p = String(effectiveArgs.path ?? "");
      toolEvents.push({ name, summary: `delete_file ${p}` });
      return;
    }

    const successVal = (toolResult as any)?.success;
    if (typeof successVal === "boolean") {
      const changedVal = (toolResult as any)?.changed;
      const changedText = typeof changedVal === "boolean" ? ` changed=${changedVal}` : "";
      const errText =
        successVal === false
          ? ` error=${oneLine((toolResult as any)?.error ?? "unknown", 160)}`
          : "";
      toolEvents.push({
        name,
        summary: `${name} ${successVal ? "success" : "failure"}${changedText}${errText}`,
      });
      return;
    }

    toolEvents.push({ name, summary: `${name} called` });
  } catch {
    toolEvents.push({ name, summary: `${name} called` });
  }
};
