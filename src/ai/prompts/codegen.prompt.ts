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
      - list_dir: List directory
      - create_new_route: Create route with page.tsx + pageConfig.json
      - insert_element: Insert element tree
      - delete_element: Delete element
      - update_classname: Update className
      - update_props: Update props
      - submit_codegen_done: Finish task

       Rules:
       - One insert_element per tree (include children inline) unless depth blocks it.
       - Create missing routes with create_new_route.
       - For any tool arg named route, always use URL paths with forward slashes (e.g. '/', '/pricing'); never use '\\' or filesystem paths like 'app/pricing'.
       - insert_element supports optional before_id to insert before an existing sibling; if omitted or not found, it appends to the end.
       - image src auto-generated from alt
       - lucide-react icons only
       - Prefer semantic Tailwind tokens (bg-background, text-foreground, border-border, ring-ring, etc.) over hardcoded colors (e.g. slate-*, bg-white). If you need different global colors/radius, call update_global_styles first, then use token-based classes.
       - update_global_styles args MUST be exactly: {"tokens": { "<tokenKey>": "<cssString>", ... }}. No other top-level keys.
       - Never call update_global_styles with an empty patch ({"tokens": {}}). If you don't need to change tokens, do not call this tool.
       - Example: {"tokens": {"radius":"0.75rem","background":"oklch(0.98 0.01 80)"}}.
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
