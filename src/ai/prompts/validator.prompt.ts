import { ValidatorIndex } from "../../types/public.js";
import {
  jsonBlock,
  mdSection,
  plannerObjectives,
  renderPlannerTaskFormatSection,
} from "./helpers/promptParts.helper.js";

export type ValidationNodePromptParams = {
  errors: Array<{
    type?: string | null;
    filePath?: string | null;
    message?: string | null;
  }>;
  history: Array<{ file?: string; fix?: string }>;
  validatorIndex: ValidatorIndex;
};

export const validatorPrompt = (params: ValidationNodePromptParams) => {
  const { errors, history, validatorIndex } = params;

  const initialPrompt = `You are a senior software engineer.
Based on the provided validation errors and fix history, generate a detailed technical implementation plan.
Provide precise, step-by-step instructions for a code-generation agent; ensure tasks are explicit and highly granular.
    `.trim();

  const objectives = plannerObjectives("validator");

  const projectConfiguration = mdSection(
    "Project Configuration",
    [
      jsonBlock(
        "FRAMEWORK CONFIG",
        validatorIndex.projectConfigs.frameworkConfig,
      ),
      jsonBlock("RUNTIME CONFIG", validatorIndex.projectConfigs.runtimeConfig),
      jsonBlock("TOOLING CONFIG", validatorIndex.projectConfigs.toolingConfig),
      jsonBlock(
        "RENDERING CONFIGURATION",
        validatorIndex.projectConfigs.renderingConfig,
      ),
    ].join("\n"),
  );

  const renderedErrors =
    errors.length === 0
      ? "- No validation errors were provided."
      : errors
          .map(
            (error) =>
              `- Type: ${error.type}\n  File: ${error.filePath}\n  Message: ${error.message}`,
          )
          .join("\n");

  const renderedHistory =
    history.length === 0
      ? "- No previous fixes attempted."
      : history
          .map((h) => `- File: ${h.file}\n  Fix Attempted: ${h.fix}`)
          .join("\n");

  const errorsInfo = mdSection(
    "Inputs (Authoritative)",
    `
Validation Errors:
${renderedErrors}

Fix History:
${renderedHistory}

      `.trim(),
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

  const rendering = renderPlannerTaskFormatSection();

  const sections = [
    initialPrompt,
    objectives,
    projectConfiguration,
    toolsInfo,
    rendering,
    errorsInfo,
  ];

  return sections.join("\n\n---\n\n");
};
