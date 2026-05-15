export type PromptRole = "planner" | "codegen" | "validator";

export const mdDivider = () => `\n---\n`;

export const mdSection = (title: string, body: string) => {
  const trimmed = body.trim();
  return trimmed.length === 0 ? `## ${title}\n` : `## ${title}\n${trimmed}\n`;
};

export const jsonBlock = (label: string, value: unknown) =>
  `${label}:\n${JSON.stringify(value ?? null, null, 2)}\n`;

export const projectStateNote = (isNewProject: boolean, role: PromptRole) => {
  if (role === "planner") {
    return isNewProject
      ? "The project you are given is currently a boilerplate project that contains some existing code. Create tasks to modify it per the PM plan; ensure there are no traces of boilerplate in the final project."
      : "The project has already gone through some stages of modification. Create tasks only for the latest PM recommendations and avoid rework.";
  }

  return isNewProject
    ? "The project is currently a boilerplate. Implement the task cleanly while removing unnecessary boilerplate patterns."
    : "The project has existing modifications. Implement the task incrementally without breaking existing architecture.";
};

export const renderPlannerTaskFormatSection = () =>
  mdSection(
    "Task Format (STRICT)",
    `
When you are done planning, you MUST call submit_planner_tasks with:

{
  "planner_tasks": [
    {
      "description": "DETAILED instruction. Include exact paths + expected end state. No code blocks.",
      "targets": ["Paths that WILL be modified or MUST be referred to."]
    }
  ]
}
    `.trim(),
  );

export const plannerObjectives = (target: PromptRole) =>
  mdSection(
    "Objectives",
    `
1) Create atomic, deterministic tasks to ${target == "validator" ? "resolve ALL validation errors" : "implement PM Plan"}  which should include exact file paths to create/modify 
2) Ensure instructions are foolproof for code-gen execution.
3) Use incremental updates; minimize full rewrites.
4) Use existing code context wherever possible.
5) Be token-efficient: concise but technically complete.
6) DO NOT write code, you have to just plan the tasks
      `.trim(),
  );
