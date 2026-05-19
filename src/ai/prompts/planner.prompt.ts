import { CollectedContext } from "../../types/context.types.js";
import { PlannerIndex } from "../../types/public.js";
import { plannerExamples } from "./examples/planner.examples.js";
import {
  jsonBlock,
  mdSection,
  projectStateNote,
  renderPlannerTaskFormatSection,
} from "./helpers/promptParts.helper.js";

export type PlanNodePromptParams = {
  planTasks: unknown[];
  collectedContext: CollectedContext;
  plannerIndex: PlannerIndex;
  isNewProject: boolean;
};

export const plannerPrompt = (params: PlanNodePromptParams) => {
  const { planTasks, collectedContext, plannerIndex, isNewProject } = params;

  const system = `
    You are a senior software architect creating implementation tasks.

    Rules:
    - Create atomic, deterministic tasks.
    - Include exact file paths to create/modify.
    - Prefer incremental edits over rewrites.
    - Reuse existing code/patterns.
    - Be concise but complete.
    - Do not write code.
    - Tasks must be directly executable by codegen agents.

    ${projectStateNote(isNewProject, "planner")}
  `.trim();
  const planTasksInfo = mdSection(
    "PM Tasks",
    jsonBlock("Tasks", planTasks ?? []),
  );

  const toolsInfo = mdSection(
    "Tools",
    `
      - read_file: read file
      - search: search codebase
      - list_dir: list dirs
      - submit_planner_tasks: Finalize planner output
    `,
  );

  const rendering = renderPlannerTaskFormatSection();

  const projectConfiguration = mdSection(
    "Project Config",
    [
      jsonBlock("framework", plannerIndex.projectConfigs.frameworkConfig),

      jsonBlock("runtime", plannerIndex.projectConfigs.runtimeConfig),

      jsonBlock("tooling", plannerIndex.projectConfigs.toolingConfig),

      jsonBlock("rendering", plannerIndex.projectConfigs.renderingConfig),
    ].join("\n"),
  );

  const context = mdSection(
    "Relevant Context",
    jsonBlock("context", collectedContext ?? {}),
  );

  const sections = [
    system,
    planTasksInfo,
    toolsInfo,
    rendering,
    projectConfiguration,
    context,
    plannerExamples,
  ];

  return sections.join("\n\n---\n\n");
};
