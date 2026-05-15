import fs from "node:fs/promises";
import path from "node:path";
import { extractAllIds } from "../helpers/elementid.helpers.js";
import { toWorkspacePath } from "../helpers/fileSystem.helpers.js";
import {
  isSafeSegment,
  normalizeRouteSegments,
} from "../helpers/pageConfigJson.helpers.js";
import { type WorkspaceDeps } from "./workspaceDeps.js";

const PAGE_TSX_TEMPLATE = [
  'import { RenderElement } from "@/lib/renderer/RenderElement";',
  'import pageConfig from "./pageConfig.json";',
  'import type { BuilderElement } from "@/types/elements";',
  "",
  "export default function Page() {",
  "  const config = pageConfig as { elements: BuilderElement[] };",
  "  return config.elements.map((el) => <RenderElement key={el.id} el={el} />);",
  "}",
  "",
].join("\n");

const DEFAULT_PAGE_CONFIG = (() => {
  const elements: any[] = [
    {
      id: "root",
      type: "div",
      className: "min-h-screen p-6",
      children: [
        {
          id: "title",
          type: "text",
          className: "text-sm font-semibold tracking-wide text-slate-200",
          props: { text: "Qwintly Starter" },
        },
      ],
    },
  ];

  // Validate uniqueness (and keep deterministic IDs).
  const ids = extractAllIds(elements as any);
  if (ids.size !== 2 || !ids.has("root") || !ids.has("title")) {
    throw new Error("DEFAULT_PAGE_CONFIG ids must be stable and unique");
  }

  return JSON.stringify({ elements }, null, 2) + "\n";
})();

export const createCreateNewRouteImpl = (deps: WorkspaceDeps) => {
  const { workspaceRoot, fs: coreFs } = deps;

  return async (parentRoute: string, routeName: string) => {
    const parentSegments = normalizeRouteSegments(parentRoute);
    const routeSegment = String(routeName ?? "").trim();

    if (!isSafeSegment(routeSegment)) {
      return "failed to create";
    }
    if (parentSegments.some((s) => !isSafeSegment(s))) {
      return "failed to create";
    }

    const appDir = toWorkspacePath(workspaceRoot, "app");
    const parentDir = path.join(appDir, ...parentSegments);
    const finalDir = path.join(parentDir, routeSegment);

    // Parent must exist (don't implicitly create arbitrary routes).
    try {
      const st = await coreFs.stat(parentDir);
      if (!st.isDirectory()) return "failed to create";
    } catch (err) {
      const code = (err as NodeJS.ErrnoException | null)?.code;
      if (code === "ENOENT") return "failed to create";
      return "failed to create";
    }

    // Route must not already exist.
    try {
      await coreFs.stat(finalDir);
      return "failed to create";
    } catch (err) {
      const code = (err as NodeJS.ErrnoException | null)?.code;
      if (code && code !== "ENOENT") return "failed to create";
    }

    const tmpDir = path.join(
      parentDir,
      `.qwintly_route_tmp_${routeSegment}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    );

    try {
      await coreFs.mkdirp(tmpDir);
      await coreFs.writeFile(path.join(tmpDir, "page.tsx"), PAGE_TSX_TEMPLATE);
      await coreFs.writeFile(
        path.join(tmpDir, "pageConfig.json"),
        DEFAULT_PAGE_CONFIG,
      );

      // Commit: move temp dir into place (best-effort atomic within same parent).
      await fs.rename(tmpDir, finalDir);

      const routePath =
        "/" + [...parentSegments, routeSegment].filter(Boolean).join("/");

      return (
        `created page.tsx successfully and content of pageConfig.json at route "${routePath}":\n` +
        DEFAULT_PAGE_CONFIG
      );
    } catch {
      // Rollback any partially-created temp output.
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup only
      }
      return "failed to create";
    }
  };
};

export const DEFAULT_PAGE_CONFIG_JSON = DEFAULT_PAGE_CONFIG;
export const PAGE_TSX_TEMPLATE_STRING = PAGE_TSX_TEMPLATE;
