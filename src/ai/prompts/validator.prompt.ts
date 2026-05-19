import { ValidatorIndex } from "../../types/public.js";
import {
  jsonBlock,
  mdSection,
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

  const system = `
    You are a senior software engineer creating fix tasks for validation failures.

    Rules:
    - Fix ALL validation errors.
    - Create atomic, deterministic tasks.
    - Include exact file paths.
    - Prefer incremental edits over rewrites.
    - Reuse existing code/patterns.
    - Be concise but complete.
    - Do not write code.
    - Tasks must be directly executable by codegen agents.
  `.trim();

  const renderedErrors =
    errors.length === 0
      ? "none"
      : errors
          .map((e) => `type:${e.type} file:${e.filePath} msg:${e.message}`)
          .join("\n");

  const renderedHistory =
    history.length === 0
      ? "none"
      : history.map((h) => `file:${h.file} fix:${h.fix}`).join("\n");

  const errorsInfo = mdSection(
    "Validation",
    `
      Errors:
      ${renderedErrors}

      History:
      ${renderedHistory}
    `.trim(),
  );

  const toolsInfo = mdSection(
    "Tools",
    `
      - read_file: read file
      - search: search codebase
      - list_dir: list dirs
      - submit_planner_tasks: submit tasks
    `.trim(),
  );

  const rendering = renderPlannerTaskFormatSection();

  const projectConfiguration = mdSection(
    "Project Config",
    [
      jsonBlock("framework", validatorIndex.projectConfigs.frameworkConfig),

      jsonBlock("runtime", validatorIndex.projectConfigs.runtimeConfig),

      jsonBlock("tooling", validatorIndex.projectConfigs.toolingConfig),

      jsonBlock("rendering", validatorIndex.projectConfigs.renderingConfig),
    ].join("\n"),
  );

  const sections = [
    system,
    errorsInfo,
    toolsInfo,
    rendering,
    projectConfiguration,
  ];

  return sections.join("\n\n---\n\n");
};
