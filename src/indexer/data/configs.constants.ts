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
    approach: "config-driven UI rendering",
    routeConventions: {
      model:
        "Routes mean URL paths (e.g. /about, /pricing) in a Next.js App Router app. Each URL route is implemented by a route folder under /app (e.g. app/about) and is driven by a colocated JSON config file.",
      definition:
        'In this repo, "route" always refers to the user-facing browser URL pathname, not an arbitrary file path.',
      examples: {
        urlRoutes: ["/", "/about", "/pricing"],
        appRouterFolders: ["app/page.tsx", "app/about/page.tsx", "app/pricing/page.tsx"],
      },
      filesPerRoute: ["page.tsx", "pageConfig.json"],
      sourceOfTruth:
        "pageConfig.json (edit this; page.tsx is a fixed renderer)",
      configShape: {
        file: "pageConfig.json",
        root: { elements: "BuilderElement[]" },
        note: "The page renders config.elements (array of BuilderElement).",
      },
      locationNote:
        "These files live inside the route folder (App Router convention). Example: for /about -> app/about/page.tsx and app/about/pageConfig.json.",
    },
    pageRenderer: {
      fileName: "page.tsx",
      behavior: [
        "Imports pageConfig from ./pageConfig.json",
        "Casts config to { elements: BuilderElement[] }",
        "Renders: config.elements.map(el => <RenderElement key={el.id} el={el} />)",
      ],
      canonicalSource: `import { RenderElement } from "@/lib/renderer/RenderElement";
import pageConfig from "./pageConfig.json";
import type { BuilderElement } from "@/types/elements";

export default function Page() {
  const config = pageConfig as { elements: BuilderElement[] };
  return config.elements.map((el) => <RenderElement key={el.id} el={el} />);
}`,
    },
    elements: {
      typeName: "BuilderElement",
      supportedTypes: [
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
      rendering: {
        notes: [
          "Unknown element types are warned and rendered as an error box.",
          "Elements support Tailwind-only styling via className.",
          "Elements may have children: BuilderElement[].",
        ],
      },
    },
    generatorGuidance: {
      do: [
        "Treat a route as a URL path (e.g. /about). Its code lives in the corresponding Next.js App Router folder (e.g. app/about).",
        "UI changes can happen only by editing that route folder's pageConfig.json elements tree.",
        "@/lib/renderer/RenderElement , @/types/elements already exist. No need to create them.",
        "When creating a new URL route (e.g. /pricing), create the App Router folder (e.g. app/pricing) with page.tsx (fixed renderer) + pageConfig.json (initial elements). After that, codegen should only modify pageConfig.json.",
        "Use Tailwind in className; prefer composition via nested children.",
      ],
      dont: [
        "Do not confuse URL routes with file paths; do not invent 'routes' that are just filenames.",
        "Do not change page.tsx structure for URL routes (it is a fixed renderer).",
        "Do not generate React components for layout; encode structure in JSON elements.",
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
