import { CollectedContext } from "../../types/context.types.js";
import { PlannerIndex } from "../../types/public.js";
import { plannerExamples } from "./examples/planner.examples.js";
import {
  jsonBlock,
  mdSection,
  plannerObjectives,
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

  const intialPrompt = `
You are a senior software architect.
Based on the provided PM plan and code context, generate a detailed technical implementation plan.
Provide precise, step-by-step instructions for a code-generation agent; ensure tasks are explicit, atomic, and ordered.
${projectStateNote(isNewProject, "planner")}
    `.trim();

  const objectives = plannerObjectives("planner");

  const context = mdSection(
    "Inputs (Authoritative)",
    [
      jsonBlock(
        "Project Context (User preferences etc.)",
        collectedContext ?? {},
      ),
    ].join("\n"),
  );

  const projectConfiguration = mdSection(
    "Project Configuration",
    [
      jsonBlock(
        "FRAMEWORK CONFIG",
        plannerIndex.projectConfigs.frameworkConfig,
      ),
      jsonBlock("RUNTIME CONFIG", plannerIndex.projectConfigs.runtimeConfig),
      jsonBlock("TOOLING CONFIG", plannerIndex.projectConfigs.toolingConfig),
      jsonBlock(
        "RENDERING CONFIGURATION",
        plannerIndex.projectConfigs.renderingConfig,
      ),
    ].join("\n"),
  );

  const toolsInfo = mdSection(
    "Tools",

    `
    You are provided access to the following tools and use them to plan coding tasks.
    
    read_file: Use it to read a file from the codebase.

    search: Use it to search for code in the codebase.
    
    list_dir: Use it to list the directory structure of the codebase.
        
    submit_planner_tasks: Use it to finalize and return the planner tasks for the code-generation agent.
    `,
  );

  const planTasksInfo = mdSection(
    "Plan Tasks",
    jsonBlock("Plan Tasks", planTasks ?? []),
  );

  const rendering = renderPlannerTaskFormatSection();

  const examples = plannerExamples;

  const plannerClosingNote =
    "Focus on clarity, minimalism, and correctness. Your plan will directly determine the success of the system.";

  const sections = [
    intialPrompt,
    objectives,
    context,
    projectConfiguration,
    toolsInfo,
    rendering,
    examples,
    planTasksInfo,
    plannerClosingNote,
  ];

  return sections.join("\n\n---\n\n");
};
