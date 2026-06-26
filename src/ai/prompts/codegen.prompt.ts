import { CodegenIndex, CollectedContext } from "../../types/public.js";
import { codegenExamples } from "./examples/codegen.examples.js";
import {
  jsonBlock,
  mdSection,
  projectStateNote,
} from "./helpers/promptParts.helper.js";

export type CodegenNodePromptParams = {
  task: any;
  codegenIndex: CodegenIndex;
  collectedContext: CollectedContext;
  isNewProject: boolean;
};

export const codegenPrompt = (params: CodegenNodePromptParams) => {
  const { task, codegenIndex, collectedContext, isNewProject } = params;

  const system = `
    You are a senior software engineer implementing tasks in an existing codebase.

    Rules:
    - Implement ONLY the requested task.
    - Prefer incremental edits over rewrites.
    - Be concise and deterministic.
    - Do not output code directly; use tools.

    ${projectStateNote(isNewProject, "codegen")}
  `.trim();

  const taskInfo = mdSection(
    "Task to implement",
    jsonBlock("task", task ?? null),
  );

  const toolsInfo = mdSection(
    "Tools",
    `
      Available tools:

      - read_file: Read file
      - update_global_styles: Update app/styleConfig.json global design tokens
      - create_new_route: Create route with page.tsx + pageConfig.json
      - modify_element: Modify elements in the page config. Supports actions: 'insert', 'update_props', 'update_classname', 'delete'.
      - get_available_routes: Get available routes
      - submit_codegen_done: Finish task

       Rules:
        - Use \`modify_element\` with action='insert' to insert an entire UI tree at once. Pass a flat array of elements under \`elements\`. The root element of your new subtree must have \`parentId\` set to match the \`parent_id\` parameter of the tool. All other elements in the array must set \`parentId\` matching the temporary \`id\` of their parent in that same array.
       - Create missing routes with create_new_route.
       - For any tool arg named route, always use URL paths with forward slashes (e.g. '/', '/pricing'); never use '\\' or filesystem paths like 'app/pricing'.
       - modify_element insert action supports optional before_id to insert before an existing sibling; if omitted or not found, it appends to the end. Use this to do things like inserting navbar before the main content area, etc.
       - Include images whenever mentioned to be included. For images, set the type to 'image' and specify the description in the 'alt' prop under 'props' (e.g. "props": { "alt": "Description of the image" }). The image src will be auto-generated from this alt text. Do not concatenate props into the parentId.
       - lucide-react icons only
       - Prefer semantic Tailwind tokens (bg-background, text-foreground, border-border, ring-ring, etc.) over hardcoded colors (e.g. slate-*, bg-white) for global styles. If you need different global colors/radius, call update_global_styles first, then use token-based classes.
       - update_global_styles args MUST be a flat JSON object with token keys as optional params. Include at least 1 key.
       - While updating global styles make sure that the styles updating (ex. background, foreground) are used in the right places (using bg-background, text-foreground, etc.). If not include them by updating the classname using modify_element update_classname tool.
       - Never call update_global_styles with {} (empty object). If you don't need to change styles, do not call this tool.
       - Example: {"radius":"0.75rem","background":"oklch(0.98 0.01 80)"}.

      `.trim(),
   );

  const projectConfiguration = mdSection(
    "Project Config",
    [
      jsonBlock("framework", codegenIndex.projectConfigs.frameworkConfig),

      jsonBlock("runtime", codegenIndex.projectConfigs.runtimeConfig),

      jsonBlock("rendering", codegenIndex.projectConfigs.renderingConfig),
    ].join("\n"),
  );

  const context = mdSection(
    "Relevant Context",
    jsonBlock("context", collectedContext ?? {}),
  );

  const sections = [
    system,
    taskInfo,
    toolsInfo,
    projectConfiguration,
    context,
    codegenExamples,
  ];

  return sections.join("\n\n---\n\n");
};
