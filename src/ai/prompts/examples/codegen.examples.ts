const examples = [
  `## Examples of tool calls

### Example: \`insert_element\` (add a CTA section)
Goal: Insert a new section under the page root on route \`/\`.

Tool call:
\`\`\`json
{
  "route": "/",
  "parent_id": "root",
  "element": {
    "type": "div",
    "className": "mt-10 flex items-center justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-6",
    "children": [
      {
        "type": "div",
        "className": "flex flex-col gap-1",
        "children": [
          { "type": "text", "className": "text-lg font-semibold text-slate-900", "props": { "text": "Ready to get started?" } },
          { "type": "text", "className": "text-sm text-slate-600", "props": { "text": "Create your first project in under a minute." } }
        ]
      },
      {
        "type": "button",
        "className": "inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800",
        "props": {
          "text": "Get Started",
          "onClick": { "kind": "route", "href": "/signup" }
        }
      }
    ]
  }
}
\`\`\`

Notes:
- Always pass a complete \`className\` string (Tailwind only).
- Use \`children\` to nest elements; children can themselves have \`children\` (deep nesting is supported).
- Use the returned \`inserted_id\` for follow-up updates.`,

  `### Example: \`update_classname\` (replace className fully)
Goal: Update styling on an existing element.

Tool call:
\`\`\`json
{
  "route": "/",
  "element_id": "el_123abc",
  "className": "mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
}
\`\`\`

Notes:
- Provide the full \`className\`; do not send partial patches.`,

  `### Example: \`update_props\` (update element props)
Goal: Update the text and click action for a button.

Tool call (function name in tool schema is \`update_element\`):
\`\`\`json
{
  "route": "/",
  "element_id": "el_123abc",
  "text": "Start free trial",
  "onClick": { "kind": "route", "href": "/pricing", "replace": false }
}
\`\`\`

Other common prop updates:
\`\`\`json
{
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
