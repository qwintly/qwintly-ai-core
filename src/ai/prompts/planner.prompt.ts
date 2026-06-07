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
      - get_available_routes: Get available routes
      - submit_planner_tasks: Finalize planner output

      Styling guidance:
      - Codegen can call update_global_styles to modify app/styleConfig.json (global design tokens).
      - Prefer semantic Tailwind token classes (bg-background, text-foreground, border-border, ring-ring, etc.) so global styles are utilized.
      - While updating global styles make sure that the styles updating (ex. background, foreground) are used in the right places. If not try including them by updating the classname
      - If a task requires changing theme tokens, specify exact update_global_styles args as a flat object: {"<tokenKey>":"<cssString>"} (never {}).
      - Try including images whereever needed in the task description. Also tell what the image should be.
      - Task creation order must follow the visual reading flow of the interface, from top to bottom, if an incremental change needs to add a section before an existing section, explicitly mention to use "before_id" param to codegen agent.
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
