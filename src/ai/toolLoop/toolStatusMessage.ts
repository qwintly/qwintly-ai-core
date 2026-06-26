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

const buildModifyElementStatus: StatusMessageBuilder = ({ name, effectiveArgs }) => {
  if (name !== "modify_element") return null;
  const action = typeof effectiveArgs.action === "string" ? effectiveArgs.action : "";
  const route = typeof effectiveArgs.route === "string" ? effectiveArgs.route : "";

  if (action === "insert") {
    const parent = typeof effectiveArgs.parent_id === "string" ? effectiveArgs.parent_id : "";
    const before = typeof effectiveArgs.before_id === "string" ? effectiveArgs.before_id : "";
    const beforeStr = before ? `, before "${before}"` : "";
    return `AI tool: Inserting element into route "${route}" (under parent "${parent}"${beforeStr})`;
  }

  if (action === "delete") {
    const id = typeof effectiveArgs.element_id === "string" ? effectiveArgs.element_id : "";
    return `AI tool: Deleting element "${id}" from route "${route}"`;
  }

  if (action === "update_classname") {
    const id = typeof effectiveArgs.element_id === "string" ? effectiveArgs.element_id : "";
    const className = typeof effectiveArgs.className === "string" ? effectiveArgs.className : "";
    const classNameStr = className ? ` to "${className}"` : "";
    return `AI tool: Updating class name for element "${id}" on route "${route}"${classNameStr}`;
  }

  if (action === "update_props") {
    const id = typeof effectiveArgs.element_id === "string" ? effectiveArgs.element_id : "";
    return `AI tool: Updating properties for element "${id}" on route "${route}"`;
  }

  return `AI tool: Modifying element on route "${route}" (action: ${action})`;
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
  buildSearchStatus,
  buildListDirStatus,
  buildUpdateGlobalStylesStatus,
  buildCreateNewRouteStatus,
  buildModifyElementStatus,
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
