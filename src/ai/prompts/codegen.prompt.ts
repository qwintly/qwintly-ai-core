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
      - image src auto-generated from alt
      - lucide-react icons only
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
