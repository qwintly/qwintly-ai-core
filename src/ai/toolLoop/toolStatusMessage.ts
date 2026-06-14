import { getApplyPatchEventMeta } from "./helpers/applyPatch.helper.js";

type StatusMessageInput = {
  name: string;
  effectiveArgs: Record<string, unknown>;
  readFileMeta: { start: number; end: number; wasCapped: boolean } | null;
};

type StatusMessageBuilder = (input: StatusMessageInput) => string | null;

const buildReadFileStatus: StatusMessageBuilder = ({
  name,
  effectiveArgs,
  readFileMeta,
}) => {
  if (name !== "read_file") return null;

  const path = typeof effectiveArgs.path === "string" ? effectiveArgs.path : "";
  if (readFileMeta) {
    return `AI tool: Reading file "${path}" (lines ${readFileMeta.start}-${readFileMeta.end}${
      readFileMeta.wasCapped ? ", capped" : ""
    })`;
  }

  const start =
    effectiveArgs.start_line === undefined ? 1 : Number(effectiveArgs.start_line);
  const end =
    effectiveArgs.end_line === undefined
      ? undefined
      : Number(effectiveArgs.end_line);
  const lines = end === undefined ? `starting at line ${start}` : `lines ${start}-${end}`;
  return `AI tool: Reading file "${path}" (${lines})`;
};

const buildWriteFileStatus: StatusMessageBuilder = ({ name, effectiveArgs }) => {
  if (name !== "write_file") return null;
  const path = typeof effectiveArgs.path === "string" ? effectiveArgs.path : "";
  return `AI tool: Writing file "${path}"`;
};

const buildApplyPatchStatus: StatusMessageBuilder = ({ name, effectiveArgs }) => {
  if (name !== "apply_patch") return null;

  const meta = getApplyPatchEventMeta(effectiveArgs);
  const files = Array.isArray(meta.files) ? meta.files : [];
  if (files.length === 0) return "AI tool: Applying patch";
  if (files.length <= 3) return `AI tool: Applying changes to "${files.join(", ")}"`;
  return `AI tool: Applying changes to ${files.length} files: "${files
    .slice(0, 3)
    .join(", ")}" (+${files.length - 3} more)`;
};

const buildSearchStatus: StatusMessageBuilder = ({ name, effectiveArgs }) => {
  if (name !== "search") return null;
  const query = typeof effectiveArgs.search_query === "string" ? effectiveArgs.search_query : "";
  return query
    ? `AI tool: Searching workspace for "${query}"`
    : "AI tool: Searching workspace";
};

const buildListDirStatus: StatusMessageBuilder = ({ name, effectiveArgs }) => {
  if (name !== "list_dir") return null;
  const path = typeof effectiveArgs.path === "string" ? effectiveArgs.path : "";
  const depth = effectiveArgs.depth === undefined ? 1 : Number(effectiveArgs.depth);
  return `AI tool: Listing contents of directory "${path}" (depth: ${depth})`;
};

const buildUpdateGlobalStylesStatus: StatusMessageBuilder = ({ name, effectiveArgs }) => {
  if (name !== "update_global_styles") return null;
  const keys = Object.keys(effectiveArgs);
  return keys.length > 0
    ? `AI tool: Updating global styles (${keys.join(", ")})`
    : "AI tool: Updating global styles";
};

const buildCreateNewRouteStatus: StatusMessageBuilder = ({ name, effectiveArgs }) => {
  if (name !== "create_new_route") return null;
  const route = typeof effectiveArgs.route_name === "string" ? effectiveArgs.route_name : "";
  const parent =
    typeof effectiveArgs.parent_route === "string" ? effectiveArgs.parent_route : "/";
  return `AI tool: Creating new route "${route}" (parent: "${parent}")`;
};

const buildDeleteElementStatus: StatusMessageBuilder = ({ name, effectiveArgs }) => {
  if (name !== "delete_element") return null;
  const route = typeof effectiveArgs.route === "string" ? effectiveArgs.route : "";
  const id = typeof effectiveArgs.element_id === "string" ? effectiveArgs.element_id : "";
  return `AI tool: Deleting element "${id}" from route "${route}"`;
};

const buildInsertElementStatus: StatusMessageBuilder = ({ name, effectiveArgs }) => {
  if (name !== "insert_element") return null;
  const route = typeof effectiveArgs.route === "string" ? effectiveArgs.route : "";
  const parent = typeof effectiveArgs.parent_id === "string" ? effectiveArgs.parent_id : "";
  const before = typeof effectiveArgs.before_id === "string" ? effectiveArgs.before_id : "";
  const beforeStr = before ? `, before "${before}"` : "";
  return `AI tool: Inserting element into route "${route}" (under parent "${parent}"${beforeStr})`;
};

const buildUpdatePropsStatus: StatusMessageBuilder = ({ name, effectiveArgs }) => {
  if (name !== "update_props") return null;
  const route = typeof effectiveArgs.route === "string" ? effectiveArgs.route : "";
  const id = typeof effectiveArgs.element_id === "string" ? effectiveArgs.element_id : "";
  return `AI tool: Updating properties for element "${id}" on route "${route}"`;
};

const buildUpdateClassnameStatus: StatusMessageBuilder = ({ name, effectiveArgs }) => {
  if (name !== "update_classname") return null;
  const route = typeof effectiveArgs.route === "string" ? effectiveArgs.route : "";
  const id = typeof effectiveArgs.element_id === "string" ? effectiveArgs.element_id : "";
  const className =
    typeof effectiveArgs.className === "string"
      ? effectiveArgs.className
      : typeof effectiveArgs.class_name === "string"
      ? effectiveArgs.class_name
      : "";
  const classNameStr = className ? ` to "${className}"` : "";
  return `AI tool: Updating class name for element "${id}" on route "${route}"${classNameStr}`;
};

const buildGetAvailableRoutesStatus: StatusMessageBuilder = ({ name }) => {
  if (name !== "get_available_routes") return null;
  return "AI tool: Retrieving available routes";
};

const buildSubmitPlannerTasksStatus: StatusMessageBuilder = ({ name }) => {
  if (name !== "submit_planner_tasks") return null;
  return "AI tool: Submitting planner tasks";
};

const buildSubmitCodegenDoneStatus: StatusMessageBuilder = ({ name, effectiveArgs }) => {
  if (name !== "submit_codegen_done") return null;
  const summary = typeof effectiveArgs.summary === "string" ? effectiveArgs.summary : "";
  return summary
    ? `AI tool: Submitting completed work: "${summary}"`
    : "AI tool: Submitting completed work";
};

const BUILDERS: StatusMessageBuilder[] = [
  buildReadFileStatus,
  buildWriteFileStatus,
  buildApplyPatchStatus,
  buildSearchStatus,
  buildListDirStatus,
  buildUpdateGlobalStylesStatus,
  buildCreateNewRouteStatus,
  buildDeleteElementStatus,
  buildInsertElementStatus,
  buildUpdatePropsStatus,
  buildUpdateClassnameStatus,
  buildGetAvailableRoutesStatus,
  buildSubmitPlannerTasksStatus,
  buildSubmitCodegenDoneStatus,
];

export const buildToolStatusMessage = (
  name: string,
  effectiveArgs: Record<string, unknown>,
  readFileMeta: { start: number; end: number; wasCapped: boolean } | null,
): string => {
  const input: StatusMessageInput = { name, effectiveArgs, readFileMeta };
  for (const b of BUILDERS) {
    const msg = b(input);
    if (msg) return msg;
  }
  return `AI tool: ${name}`;
};

