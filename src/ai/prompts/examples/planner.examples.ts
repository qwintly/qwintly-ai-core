const examples = [
  `## Examples

### Example: \`submit_planner_tasks\` (final response format)
Goal: Return an ordered, atomic task list for the codegen agent.

Tool call:
\`\`\`json
{
  "planner_tasks": [
    {
      "description": "Create the /pricing route using create_new_route if it does not exist, and ensure app/pricing/page.tsx imports and renders the pageConfig.json elements via the standard renderer pattern used in this repo.",
      "targets": ["app/pricing/page.tsx", "app/pricing/pageConfig.json"]
    },
    {
      "description": "Update app/pricing/pageConfig.json to add a hero section with a title, subtitle, and two buttons (Primary: 'Start free trial' routes to /signup, Secondary: 'View docs' opens an external link in a new tab). Add a hero image, a person sitting on a laptop in a bright office, and a quote. Ensure all elements have ids and use Tailwind className strings only.",
      "targets": ["app/pricing/pageConfig.json"]
    },
    {
      "description": "Add a 3-tier pricing cards section (Starter/Pro/Enterprise) in app/pricing/pageConfig.json with consistent spacing, responsive layout, and clear feature bullet lists. Use lucide-react icons for checkmarks and keep the JSON tree minimal and readable.",
      "targets": ["app/pricing/pageConfig.json"]
    },
    {
      "description": "Create an items section for cakes. Include images of cakes",
      "targets": ["app/items/pageConfig.json"]
    }
  ]
}
\`\`\`

Notes:
- Each task must be atomic and ordered.
- You can ask to include images whereever needed in the task description. Also tell what the image should be.
- \`description\` must NOT include code blocks; reference exact paths and expected end state.
- \`targets\` must be workspace-relative paths that will be modified or referenced.`,
];

export const plannerExamples = examples.join("\n");
