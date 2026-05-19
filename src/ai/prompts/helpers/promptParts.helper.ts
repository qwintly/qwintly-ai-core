export type PromptRole = "planner" | "codegen" | "validator";

export const mdSection = (title: string, body: string) => {
  const trimmed = body.trim();
  return `<${title}>${trimmed}</${title}>`;
};

export const jsonBlock = (label: string, value: unknown) =>
  `${label}:${JSON.stringify(value ?? null)}\n`;

export const projectStateNote = (isNewProject: boolean, role: PromptRole) => {
  if (role === "planner") {
    return isNewProject
      ? "The project you are given is currently a boilerplate project that contains some existing code. Create tasks to modify project according to PM plan and context; remove boilerplate traces."
      : "Plan only latest PM changes; avoid rework";
  }

  return isNewProject
    ? "The project is currently a boilerplate. Implement task cleanly while removing boilerplate patterns."
    : "Implement task incrementally without breaking existing architecture.";
};

export const renderPlannerTaskFormatSection = () =>
  mdSection(
    "Task Format (STRICT)",
    `
After planning, Call submit_planner_tasks with:

{
  "planner_tasks": [
    {
      "description": "Exact changes + paths. No code",
      "targets": ["Paths that to be modified or referenced"]
    }
  ]
}
    `.trim(),
  );
