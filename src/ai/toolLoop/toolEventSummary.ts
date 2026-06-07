import { STYLE_TOKEN_KEYS } from "../../types/styleConfig.js";
import { getApplyPatchEventMeta } from "./helpers/applyPatch.helper.js";
import { ToolEvent } from "./toolLoopContext.js";

export type ToolEventSummaryInput = {
  name: string;
  effectiveArgs: Record<string, unknown>;
  modelArgs: Record<string, unknown>;
  readFileMeta: { start: number; end: number; wasCapped: boolean } | null;
  toolResult: unknown;
  toolResultRaw: unknown;
};

const oneLine = (value: unknown, maxLen = 140) => {
  let raw = "";
  if (typeof value === "string") {
    raw = value;
  } else if (value === undefined) {
    raw = "";
  } else if (value === null) {
    raw = "null";
  } else {
    raw = JSON.stringify(value);
  }
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxLen) return collapsed;
  return `${collapsed.slice(0, Math.max(0, maxLen - 1))}…`;
};

const getStringArg = (effectiveArgs: Record<string, unknown>, key: string) =>
  oneLine(effectiveArgs[key] ?? "");

type ToolEventSummarizer = (input: ToolEventSummaryInput) => ToolEvent | null;

const summarizeReadFile: ToolEventSummarizer = (input) => {
  if (input.name !== "read_file") return null;

  const path = typeof input.effectiveArgs.path === "string" ? input.effectiveArgs.path : "";
  const start =
    input.readFileMeta?.start ?? Number(input.effectiveArgs.start_line ?? 1);
  const end =
    input.readFileMeta?.end ?? Number(input.effectiveArgs.end_line ?? start);

  return {
    name: input.name,
    summary: `read_file ${path}:${start}-${end}${
      input.readFileMeta?.wasCapped ? " (capped)" : ""
    }`,
  };
};

const summarizeApplyPatch: ToolEventSummarizer = (input) => {
  if (input.name !== "apply_patch") return null;

  const meta =
    typeof (input.modelArgs as any).patch_string === "object"
      ? ((input.modelArgs as any).patch_string as any)
      : null;
  const fallback = getApplyPatchEventMeta(input.effectiveArgs);
  let ok = "done";
  if ((input.toolResult as any)?.success === true) {
    ok = "success";
  } else if ((input.toolResult as any)?.success === false) {
    ok = "failure";
  }

  return {
    name: input.name,
    summary: `apply_patch files=${JSON.stringify(
      meta?.files ?? fallback.files,
    )} sha256=${String(meta?.sha256 ?? fallback.sha256).slice(0, 12)} chars=${
      meta?.chars ?? fallback.chars
    } result=${ok}`,
  };
};

const summarizeCreateNewRoute: ToolEventSummarizer = (input) => {
  if (input.name !== "create_new_route") return null;

  const parentRoute = getStringArg(input.effectiveArgs, "parent_route") || "/";
  const routeName = getStringArg(input.effectiveArgs, "route_name");
  const successVal = (input.toolResult as any)?.success;
  if (typeof successVal !== "boolean") return null;

  const route = oneLine((input.toolResult as any)?.route ?? "");
  const createdFiles = Array.isArray((input.toolResult as any)?.created_files)
    ? ((input.toolResult as any).created_files as unknown[])
    : [];

  const filesText =
    successVal === true ? ` created_files=${createdFiles.length}` : "";
  const routeText = route ? ` route=${route}` : "";
  const errText =
    successVal === false
      ? ` error=${oneLine((input.toolResult as any)?.error ?? "unknown", 160)}`
      : "";

  return {
    name: input.name,
    summary: `create_new_route ${successVal ? "success" : "failure"} parent_route=${parentRoute} route_name=${routeName}${routeText}${filesText}${errText}`,
  };
};

const summarizeInsertElement: ToolEventSummarizer = (input) => {
  if (input.name !== "insert_element") return null;

  const route = getStringArg(input.effectiveArgs, "route");
  const parentId = getStringArg(input.effectiveArgs, "parent_id");
  const beforeId = getStringArg(input.effectiveArgs, "before_id");
  const successVal = (input.toolResult as any)?.success;
  if (typeof successVal !== "boolean") return null;

  const insertedId = oneLine((input.toolResult as any)?.inserted_id ?? "");
  const changedVal = (input.toolResult as any)?.changed;
  const changedText =
    typeof changedVal === "boolean" ? ` changed=${changedVal}` : "";
  const beforeText = beforeId ? ` before_id=${beforeId}` : "";
  const insertedText = insertedId ? ` inserted_id=${insertedId}` : "";
  const errText =
    successVal === false
      ? ` error=${oneLine((input.toolResult as any)?.error ?? "unknown", 160)}`
      : "";

  return {
    name: input.name,
    summary: `insert_element ${successVal ? "success" : "failure"} route=${route} parent_id=${parentId}${beforeText}${insertedText}${changedText}${errText}`,
  };
};

const summarizeUpdateClassname: ToolEventSummarizer = (input) => {
  if (input.name !== "update_classname") return null;

  const route = getStringArg(input.effectiveArgs, "route");
  const elementId = getStringArg(input.effectiveArgs, "element_id");
  const className = oneLine((input.effectiveArgs as any).className ?? "", 160);
  const successVal = (input.toolResult as any)?.success;
  if (typeof successVal !== "boolean") return null;

  const changedVal = (input.toolResult as any)?.changed;
  const changedText =
    typeof changedVal === "boolean" ? ` changed=${changedVal}` : "";
  const updatedId = oneLine((input.toolResult as any)?.updated_id ?? "");
  const updatedText = updatedId ? ` updated_id=${updatedId}` : "";
  const errText =
    successVal === false
      ? ` error=${oneLine((input.toolResult as any)?.error ?? "unknown", 160)}`
      : "";

  return {
    name: input.name,
    summary: `update_classname ${successVal ? "success" : "failure"} route=${route} element_id=${elementId} className="${className}"${updatedText}${changedText}${errText}`,
  };
};

const summarizeUpdateProps: ToolEventSummarizer = (input) => {
  if (input.name !== "update_props") return null;

  const route = getStringArg(input.effectiveArgs, "route");
  const elementId = getStringArg(input.effectiveArgs, "element_id");
  const successVal = (input.toolResult as any)?.success;
  if (typeof successVal !== "boolean") return null;

  const changedVal = (input.toolResult as any)?.changed;
  const changedText =
    typeof changedVal === "boolean" ? ` changed=${changedVal}` : "";
  const updatedId = oneLine((input.toolResult as any)?.updated_id ?? "");
  const updatedText = updatedId ? ` updated_id=${updatedId}` : "";

  const patchKeys = Object.keys(input.effectiveArgs ?? {}).filter((k) => {
    if (k === "route" || k === "element_id") return false;
    const v = (input.effectiveArgs as any)[k];
    return v !== undefined && v !== null;
  });
  patchKeys.sort((a, b) => a.localeCompare(b));
  const keysText =
    patchKeys.length > 0
      ? ` keys=${oneLine(patchKeys.join(","), 140)}`
      : "";

  const errText =
    successVal === false
      ? ` error=${oneLine((input.toolResult as any)?.error ?? "unknown", 160)}`
      : "";

  return {
    name: input.name,
    summary: `update_props ${successVal ? "success" : "failure"} route=${route} element_id=${elementId}${keysText}${updatedText}${changedText}${errText}`,
  };
};

const summarizeUpdateGlobalStyles: ToolEventSummarizer = (input) => {
  if (input.name !== "update_global_styles") return null;

  const tokenKeySet = new Set<string>(STYLE_TOKEN_KEYS as unknown as string[]);
  const tokenKeys = Object.keys(input.effectiveArgs ?? {}).filter((k) =>
    tokenKeySet.has(k),
  );
  const successVal = (input.toolResult as any)?.success;
  if (typeof successVal !== "boolean") return null;

  const changedVal = (input.toolResult as any)?.changed;
  const changedText =
    typeof changedVal === "boolean" ? ` changed=${changedVal}` : "";
  const version = (input.toolResult as any)?.version;
  const versionText =
    typeof version === "number" && Number.isFinite(version)
      ? ` version=${version}`
      : "";
  const created = (input.toolResult as any)?.created;
  const createdText = typeof created === "boolean" ? ` created=${created}` : "";
  tokenKeys.sort((a, b) => a.localeCompare(b));
  const keysText =
    tokenKeys.length > 0
      ? ` tokens=${oneLine(tokenKeys.join(","), 160)}`
      : "";
  const errText =
    successVal === false
      ? ` error=${oneLine((input.toolResult as any)?.error ?? "unknown", 160)}`
      : "";

  return {
    name: input.name,
    summary: `update_global_styles ${successVal ? "success" : "failure"}${keysText}${versionText}${createdText}${changedText}${errText}`,
  };
};

const summarizeSearch: ToolEventSummarizer = (input) => {
  if (input.name !== "search") return null;

  const q = typeof input.effectiveArgs.search_query === "string" ? input.effectiveArgs.search_query.trim() : "";
  const results = Array.isArray((input.toolResultRaw as any)?.results)
    ? (input.toolResultRaw as any).results
    : [];

  return {
    name: input.name,
    summary: `search "${q}" -> ${results.length} results`,
  };
};

const summarizeListDir: ToolEventSummarizer = (input) => {
  if (input.name !== "list_dir") return null;

  const p = typeof input.effectiveArgs.path === "string" ? input.effectiveArgs.path : "";
  const d = Number(input.effectiveArgs.depth ?? 1);
  return { name: input.name, summary: `list_dir ${p} depth=${d}` };
};

const summarizeCreateFile: ToolEventSummarizer = (input) => {
  if (input.name !== "create_file") return null;
  const p = typeof input.effectiveArgs.path === "string" ? input.effectiveArgs.path : "";
  return { name: input.name, summary: `create_file ${p}` };
};

const summarizeDeleteFile: ToolEventSummarizer = (input) => {
  if (input.name !== "delete_file") return null;
  const p = typeof input.effectiveArgs.path === "string" ? input.effectiveArgs.path : "";
  return { name: input.name, summary: `delete_file ${p}` };
};

const summarizeGenericSuccessFailure: ToolEventSummarizer = (input) => {
  const successVal = (input.toolResult as any)?.success;
  if (typeof successVal !== "boolean") return null;

  const changedVal = (input.toolResult as any)?.changed;
  const changedText =
    typeof changedVal === "boolean" ? ` changed=${changedVal}` : "";
  const errText =
    successVal === false
      ? ` error=${oneLine((input.toolResult as any)?.error ?? "unknown", 160)}`
      : "";

  return {
    name: input.name,
    summary: `${input.name} ${successVal ? "success" : "failure"}${changedText}${errText}`,
  };
};

const SUMMARIZERS: ToolEventSummarizer[] = [
  summarizeReadFile,
  summarizeApplyPatch,
  summarizeCreateNewRoute,
  summarizeInsertElement,
  summarizeUpdateClassname,
  summarizeUpdateProps,
  summarizeUpdateGlobalStyles,
  summarizeSearch,
  summarizeListDir,
  summarizeCreateFile,
  summarizeDeleteFile,
  summarizeGenericSuccessFailure,
];

export const buildToolEventSummary = (
  input: ToolEventSummaryInput,
): ToolEvent => {
  for (const summarizer of SUMMARIZERS) {
    const evt = summarizer(input);
    if (evt) return evt;
  }
  return { name: input.name, summary: `${input.name} called` };
};

export const recordToolEvent = (params: {
  name: string;
  effectiveArgs: Record<string, unknown>;
  modelArgs: Record<string, unknown>;
  readFileMeta: { start: number; end: number; wasCapped: boolean } | null;
  toolEvents: ToolEvent[];
  toolResult: unknown;
  toolResultRaw: unknown;
}) => {
  const { toolEvents, name } = params;
  try {
    toolEvents.push(buildToolEventSummary(params));
  } catch {
    toolEvents.push({ name, summary: `${name} called` });
    return;
  }
};
