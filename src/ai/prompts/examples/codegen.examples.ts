const examples = [
  `## Examples of tool calls

  ### Example: \`modify_element\` (action='insert' to add a CTA section)
  Goal: Insert a new section under the page root on route \`/\`.

Tool call:
\`\`\`json
{
  "action": "insert",
  "route": "/",
  "parent_id": "root",
  "before_id": "el_existing_sibling_id",
  "elements": [
    {
      "id": "cta_section",
      "parentId": "root",
      "type": "div",
      "className": "mt-10 flex items-center justify-between gap-6 rounded-2xl border border-border bg-background p-6 text-foreground"
    },
    {
      "id": "text_container",
      "parentId": "cta_section",
      "type": "div",
      "className": "flex flex-col gap-1"
    },
    {
      "id": "cta_heading",
      "parentId": "text_container",
      "type": "text",
      "className": "text-lg font-semibold",
      "props": { "text": "Ready to get started?" }
    },
    {
      "id": "cta_subheading",
      "parentId": "text_container",
      "type": "text",
      "className": "text-sm text-muted-foreground",
      "props": { "text": "Create your first project in under a minute." }
    },
    {
      "id": "cta_btn",
      "parentId": "cta_section",
      "type": "button",
      "className": "inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90",
      "props": {
        "text": "Get Started",
        "onClick": { "kind": "route", "href": "/signup" }
      }
    },
    {
      "id": "cta_image_wrap",
      "parentId": "cta_section",
      "type": "div",
      "className": "w-24 h-24 rounded-full overflow-hidden"
    },
    {
      "id": "cta_image",
      "parentId": "cta_image_wrap",
      "type": "image",
      "className": "w-full h-full object-cover",
      "props": {
        "alt": "A team collaborating in a bright workspace"
      }
    }
  ]
}
\`\`\`

  Notes:
  - Always pass a complete \`className\` string (Tailwind only).
  - Use \`elements\` flat list to represent UI structures of arbitrary depth.
  - Link child elements to their parent in the array by setting \`parentId\` to the parent element's temporary \`id\`.
  - The root element in the \`elements\` array must have \`parentId\` set to match the target \`parent_id\` parameter of the tool.
  - Optional \`before_id\` inserts before an existing sibling; omit it to append at the end.
  - Use the returned \`inserted_id\` for follow-up updates.`,

  `### Example: \`update_global_styles\` (change global tokens)
Goal: Adjust global theme tokens so semantic Tailwind classes (\`bg-background\`, \`text-foreground\`, \`border-border\`, etc.) reflect the desired look.

Tool call:
\`\`\`json
{
  "radius": "0.75rem",
  "background": "oklch(0.985 0.008 80.2)",
  "primary": "oklch(0.62 0.16 199.4)"
}
\`\`\`

Notes:
- Args are a flat JSON object with token keys as optional params.
- Include at least 1 key/value; never call \`update_global_styles\` with \`{}\`.
- Use safe, non-empty CSS strings (avoid \`<\`, \`>\`, or \`</style\`).`,

  `### Example: \`modify_element\` (action='update_classname' to replace className fully)
Goal: Update styling on an existing element.

Tool call:
\`\`\`json
{
  "action": "update_classname",
  "route": "/",
  "element_id": "el_123abc",
  "className": "mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
}
\`\`\`

Notes:
- Provide the full \`className\`; do not send partial patches.`,

  `### Example: \`modify_element\` (action='update_props' to update element props)
Goal: Update the text and click action for a button.

Tool call:
\`\`\`json
{
  "action": "update_props",
  "route": "/",
  "element_id": "el_123abc",
  "text": "Start free trial",
  "onClick": { "kind": "route", "href": "/pricing", "replace": false }
}
\`\`\`

Other common prop updates:
\`\`\`json
{
  "action": "update_props",
  "route": "/",
  "element_id": "el_img_001",
  "alt": "A person collaborating on a laptop in a bright office"
}
\`\`\`

Notes:
- Only include props you want to change; omitted fields remain unchanged.
- For images, \`alt\` is also used to fetch a suitable Unsplash image (src is auto-resolved).`,
];

export const codegenExamples = examples.join("\n");
