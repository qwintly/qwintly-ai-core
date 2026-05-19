import { ProjectConfigsConfig } from "../../types/index/configs.types.js";
import { IndexingConfig } from "../../types/index/indexing.types.js";

export const projectConfigs = {
  frameworkConfig: {
    name: "Next.js",
    router: "App Router",
    language: "TypeScript",
    icons: "lucide-react icons",
    styling: "Tailwind CSS",
  },
  runtimeConfig: {
    target: "frontend-only",
    serverActions: "disabled",
    apiRoutes: "disabled",
    dataFetching: "client-side (fetch or mocked)",
  },
  toolingConfig: {
    packageManager: "npm",
    linting: "eslint",
    formatting: "prettier",
    typecheck: "tsc --noEmit",
    testing: "none",
  },
  renderingConfig: {
    approach: "config-driven",

    routes: {
      meaning: "URL pathname, not file path",
      examples: ["/", "/about", "/pricing"],

      structure: {
        "/": "app/page.tsx + app/pageConfig.json",
        "/about": "app/about/page.tsx + app/about/pageConfig.json",
      },

      files: ["page.tsx", "pageConfig.json"],

      sourceOfTruth: "pageConfig.json",

      config: {
        root: "elements: BuilderElement[]",
      },
    },

    renderer: {
      file: "page.tsx",

      behavior: [
        "imports ./pageConfig.json",
        "casts to { elements: BuilderElement[] }",
        "renders config.elements with RenderElement",
      ],

      fixed: true,
    },

    elements: {
      type: "BuilderElement",

      supported: [
        "fragment",
        "div",
        "text",
        "image",
        "button",
        "input",
        "textarea",
        "link",
        "icon",
      ],

      rules: [
        "Tailwind via className only",
        "supports children: BuilderElement[]",
        "unknown types render error UI",
      ],
    },

    guidance: {
      do: [
        "route = URL path",
        "edit only pageConfig.json for UI changes",
        "keep '/' populated",
        "RenderElement and BuilderElement already exist",
        "new routes require page.tsx + pageConfig.json",
        "prefer nested composition",
      ],

      dont: [
        "don't treat routes as file paths",
        "don't generate React layout components",
        "You are not allowed to modify anything other than pageConfig.json. Edits to page.tsx, layout.tsx, global.css, tailwind.config.ts are strictly prohibited. You can however create new routes with new pageConfig.json files but they will have fixed page.tsx.",
      ],
    },
  },
} as const satisfies ProjectConfigsConfig;

export const indexing = {
  includeExtensions: [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".md",
    ".mdx",
    ".css",
    ".scss",
    ".sass",
  ],
  excludeDirectories: [
    "node_modules",
    ".next",
    "dist",
    "build",
    "out",
    "coverage",
    ".git",
  ],
  maxFileBytes: 200_000,
  chunkSize: 900,
  chunkOverlap: 150,
} as const satisfies IndexingConfig;
