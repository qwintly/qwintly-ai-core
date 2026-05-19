import fs from "node:fs/promises";
import path from "node:path";
import { extractAllIds } from "../helpers/elementid.helpers.js";
import { toWorkspacePath } from "../helpers/fileSystem.helpers.js";
import {
  isSafeSegment,
  normalizeRouteSegments,
} from "../helpers/pageConfigJson.helpers.js";
import { type WorkspaceDeps } from "./workspaceDeps.js";

type CreateNewRouteResult =
  | {
      success: true;
      route: string;
      created_files: string[];
      page_config_json: unknown;
    }
  | { success: false; error: string };

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
      props: {},
    },
  ];

  // Validate uniqueness (and keep deterministic IDs).
  const ids = extractAllIds(elements as any);
  if (!ids.has("root")) {
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
      return {
        success: false,
        error: "Invalid route name",
      } satisfies CreateNewRouteResult;
    }
    if (parentSegments.some((s) => !isSafeSegment(s))) {
      return {
        success: false,
        error: "Invalid parent route",
      } satisfies CreateNewRouteResult;
    }

    const appDir = toWorkspacePath(workspaceRoot, "app");
    const parentDir = path.join(appDir, ...parentSegments);
    const finalDir = path.join(parentDir, routeSegment);

    // Parent must exist (don't implicitly create arbitrary routes).
    try {
      const st = await coreFs.stat(parentDir);
      if (!st.isDirectory()) {
        return {
          success: false,
          error: "Parent not a folder",
        } satisfies CreateNewRouteResult;
      }
    } catch (err) {
      const code = (err as NodeJS.ErrnoException | null)?.code;
      if (code === "ENOENT") {
        return {
          success: false,
          error: "Parent route missing",
        } satisfies CreateNewRouteResult;
      }
      return {
        success: false,
        error: "Parent check failed",
      } satisfies CreateNewRouteResult;
    }

    // Route must not already exist.
    try {
      await coreFs.stat(finalDir);
      return {
        success: false,
        error: "Route already exists",
      } satisfies CreateNewRouteResult;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException | null)?.code;
      if (code && code !== "ENOENT") {
        return {
          success: false,
          error: "Route check failed",
        } satisfies CreateNewRouteResult;
      }
    }

    const tmpDir = path.join(
      parentDir,
      `.qwintly_route_tmp_${routeSegment}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    );

    const rollback = async () => {
      // Rollback any partially-created temp output.
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup only
      }
    };

    try {
      await coreFs.mkdirp(tmpDir);
    } catch (err) {
      await rollback();
      return {
        success: false,
        error: "Temp folder create failed",
      } satisfies CreateNewRouteResult;
    }

    try {
      await coreFs.writeFile(path.join(tmpDir, "page.tsx"), PAGE_TSX_TEMPLATE);
    } catch (err) {
      await rollback();
      return {
        success: false,
        error: "Write page.tsx failed",
      } satisfies CreateNewRouteResult;
    }

    try {
      await coreFs.writeFile(
        path.join(tmpDir, "pageConfig.json"),
        DEFAULT_PAGE_CONFIG,
      );
    } catch (err) {
      await rollback();
      return {
        success: false,
        error: "Write pageConfig failed",
      } satisfies CreateNewRouteResult;
    }

    try {
      // Commit: move temp dir into place (best-effort atomic within same parent).
      await fs.rename(tmpDir, finalDir);
    } catch (err) {
      await rollback();
      return {
        success: false,
        error: "Finalize route failed",
      } satisfies CreateNewRouteResult;
    }

    const routePath =
      "/" + [...parentSegments, routeSegment].filter(Boolean).join("/");

    let pageConfigJson: unknown = null;
    try {
      pageConfigJson = JSON.parse(DEFAULT_PAGE_CONFIG);
    } catch {
      // shouldn't happen, but keep the tool robust
      pageConfigJson = { elements: [] };
    }

    return {
      success: true,
      route: routePath,
      created_files: [
        path
          .join("app", ...parentSegments, routeSegment, "page.tsx")
          .replace(/\\/g, "/"),
        path
          .join("app", ...parentSegments, routeSegment, "pageConfig.json")
          .replace(/\\/g, "/"),
      ],
      page_config_json: pageConfigJson,
    } satisfies CreateNewRouteResult;
  };
};

export const DEFAULT_PAGE_CONFIG_JSON = DEFAULT_PAGE_CONFIG;
export const PAGE_TSX_TEMPLATE_STRING = PAGE_TSX_TEMPLATE;
