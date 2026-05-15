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
      model: "Every route is driven by a colocated JSON config file.",
      filesPerRoute: ["page.tsx", "pageConfig.json"],
      sourceOfTruth:
        "pageConfig.json (edit this; page.tsx is a fixed renderer)",
      configShape: {
        file: "pageConfig.json",
        root: { elements: "BuilderElement[]" },
        note: "The page renders config.elements (array of BuilderElement).",
      },
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
        "UI changes can happen only by editing the route's pageConfig.json elements tree.",
        "Use Tailwind in className; prefer composition via nested children.",
      ],
      dont: [
        "Do not change page.tsx structure for routes (it is a fixed renderer).",
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
