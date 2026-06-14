import fs from "node:fs/promises";
import path from "node:path";
import type { BuilderElement } from "../../../types/elements.js";
import type { CoreFs } from "../implementations/workspaceDeps.js";
import { createElementId } from "./elementid.helpers.js";
import { toWorkspacePath } from "./fileSystem.helpers.js";

export type PageConfigJson = {
  elements: BuilderElement[];
};

export const normalizeRouteSegments = (route: string): string[] => {
  const raw = String(route ?? "").trim();
  if (!raw || raw === "/") return [];
  return raw
    .replace(/\\/g, "/")
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
};

export const isSafeSegment = (segment: string) => {
  const s = String(segment ?? "").trim();
  if (!s) return false;
  if (s === "." || s === "..") return false;
  if (s.includes("/") || s.includes("\\")) return false;
  return true;
};

export const getPageConfigJsonPath = (workspaceRoot: string, route: string) => {
  const segments = normalizeRouteSegments(route);
  if (segments.some((s) => !isSafeSegment(s))) {
    throw new Error("invalid route");
  }
  const rel = path.posix.join("app", ...segments, "pageConfig.json");
  return toWorkspacePath(workspaceRoot, rel);
};

export const parsePageConfigJson = (content: string): PageConfigJson => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(content ?? ""));
  } catch {
    throw new Error("pageConfig.json is not valid JSON");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("pageConfig.json must be an object");
  }

  const elements = (parsed as any).elements;
  if (!Array.isArray(elements)) {
    throw new Error('pageConfig.json must contain "elements" array');
  }

  return { elements: elements as BuilderElement[] };
};

export const stringifyPageConfigJson = (config: PageConfigJson) =>
  JSON.stringify({ elements: config.elements ?? [] }, null, 2) + "\n";

export const extractAllIdsDeep = (elements: BuilderElement[]) => {
  const ids = new Set<string>();
  const walk = (arr: BuilderElement[]) => {
    for (const el of arr) {
      if (!el || typeof el !== "object") continue;
      const id = (el as any).id;
      if (typeof id === "string" && id.trim()) ids.add(id.trim());
      const children = (el as any).children;
      if (Array.isArray(children)) walk(children as BuilderElement[]);
    }
  };
  walk(Array.isArray(elements) ? elements : []);
  return ids;
};

export const ensureElementIds = (
  elements: BuilderElement[],
  existingIds: Set<string>,
) => {
  const seen = new Set<string>();
  const walk = (arr: BuilderElement[]) => {
    for (const el of arr) {
      if (!el || typeof el !== "object") continue;

      const anyEl = el as any;
      const currentId = typeof anyEl.id === "string" ? anyEl.id.trim() : "";
      if (!currentId || seen.has(currentId)) {
        const newId = createElementId(existingIds);
        anyEl.id = newId;
        existingIds.add(newId);
        seen.add(newId);
      } else {
        anyEl.id = currentId;
        existingIds.add(currentId);
        seen.add(currentId);
      }

      if (Array.isArray(anyEl.children)) {
        walk(anyEl.children as BuilderElement[]);
      }
    }
  };
  walk(elements);
};

export const findElementById = (
  elements: BuilderElement[],
  elementId: string,
): BuilderElement | null => {
  const id = String(elementId ?? "").trim();
  if (!id) return null;

  const walk = (arr: BuilderElement[]): BuilderElement | null => {
    for (const el of arr) {
      if (!el || typeof el !== "object") continue;
      if ((el as any).id === id) return el;
      const children = (el as any).children;
      if (Array.isArray(children)) {
        const found = walk(children as BuilderElement[]);
        if (found) return found;
      }
    }
    return null;
  };

  return walk(elements);
};

export const deleteElementById = (
  elements: BuilderElement[],
  id: string,
): boolean => {
  const target = String(id ?? "").trim();
  if (!target) return false;

  let deleted = false;
  const walk = (arr: BuilderElement[]) => {
    for (let idx = arr.length - 1; idx >= 0; idx--) {
      const el = arr[idx] as any;
      if (el?.id === target) {
        arr.splice(idx, 1);
        deleted = true;
        continue;
      }
      if (Array.isArray(el?.children)) walk(el.children as BuilderElement[]);
    }
  };
  walk(elements);
  return deleted;
};

export const writeFileAtomic = async (filePath: string, content: string) => {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const tmp = path.join(
    dir,
    `.qwintly_tmp_${base}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
  );
  const bak = path.join(
    dir,
    `.qwintly_bak_${base}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
  );

  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(tmp, content ?? "", "utf-8");

    // Windows rename doesn't overwrite; do a 2-step swap.
    try {
      await fs.rename(filePath, bak);
      await fs.rename(tmp, filePath);
      await fs.rm(bak, { force: true });
    } catch (err) {
      const code = (err as NodeJS.ErrnoException | null)?.code;
      if (code === "ENOENT") {
        // No previous file; just put the temp file in place.
        await fs.rename(tmp, filePath);
      } else {
        throw err;
      }
    }
  } catch (err) {
    // rollback best-effort
    try {
      await fs.rm(tmp, { force: true });
    } catch {
      // ignore
    }
    try {
      await fs.stat(bak);
      try {
        await fs.rm(filePath, { force: true });
      } catch {
        // ignore
      }
      await fs.rename(bak, filePath);
    } catch {
      // ignore
    }
    throw err;
  }
};

export const getAvailableRoutes = async (deps: {
  workspaceRoot: string;
  fs: {
    safeReadDir: (absoluteDir: string) => Promise<
      Array<{
        name: string;
        isDirectory: () => boolean;
        isFile: () => boolean;
      }>
    >;
  };
}): Promise<string[]> => {
  const { workspaceRoot, fs } = deps;
  const appDir = toWorkspacePath(workspaceRoot, "app");
  const routes: string[] = [];

  const scan = async (dirPath: string) => {
    let entries;
    try {
      entries = await fs.safeReadDir(dirPath);
    } catch {
      return;
    }

    let hasPageConfig = false;
    for (const entry of entries) {
      if (entry.isFile() && entry.name === "pageConfig.json") {
        hasPageConfig = true;
        break;
      }
    }

    if (hasPageConfig) {
      const rel = path.relative(appDir, dirPath);
      const routeStr = "/" + rel.replace(/\\/g, "/");
      routes.push(routeStr === "/" ? "/" : routeStr.replace(/\/$/, ""));
    }

    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        entry.name !== "node_modules" &&
        !entry.name.startsWith(".")
      ) {
        await scan(path.join(dirPath, entry.name));
      }
    }
  };

  await scan(appDir);
  return routes.sort((a, b) => a.localeCompare(b));
};

const isCatchAll = (segment: string): boolean =>
  segment.startsWith("[") && segment.endsWith("]") && segment.includes("...");

const isDynamic = (segment: string): boolean =>
  segment.startsWith("[") && segment.endsWith("]");

const isOptionalCatchAll = (segment: string): boolean =>
  segment.startsWith("[[") && segment.endsWith("]]") && segment.includes("...");

export const matchRoute = (
  physicalRoute: string,
  requestedRoute: string,
): boolean => {
  const physSegs = normalizeRouteSegments(physicalRoute);
  const reqSegs = normalizeRouteSegments(requestedRoute);

  let pIdx = 0;
  let rIdx = 0;

  while (pIdx < physSegs.length && rIdx < reqSegs.length) {
    const phys = physSegs[pIdx];
    const req = reqSegs[rIdx];

    if (isCatchAll(phys)) {
      return true;
    }

    if (isDynamic(phys) || phys.toLowerCase() === req.toLowerCase()) {
      pIdx++;
      rIdx++;
      continue;
    }

    return false;
  }

  if (rIdx === reqSegs.length && pIdx < physSegs.length) {
    return physSegs.slice(pIdx).every(isOptionalCatchAll);
  }

  return pIdx === physSegs.length && rIdx === reqSegs.length;
};

export const resolvePageConfigJsonPath = async (
  workspaceRoot: string,
  route: string,
  fs: CoreFs,
): Promise<string> => {
  // 1. Try exact match first
  const exactPath = getPageConfigJsonPath(workspaceRoot, route);
  try {
    await fs.stat(exactPath);
    return exactPath;
  } catch {
    // Exact file does not exist, let's resolve dynamically
  }

  // 2. Fetch all available routes in the workspace
  const available = await getAvailableRoutes({ workspaceRoot, fs });

  // 3. Find first matching route
  for (const physRoute of available) {
    if (matchRoute(physRoute, route)) {
      return getPageConfigJsonPath(workspaceRoot, physRoute);
    }
  }

  // 4. Fallback: if no match, just return the exact path
  return exactPath;
};

export const loadAndPreparePageConfig = async (
  workspaceRoot: string,
  route: string,
  fs: CoreFs,
) => {
  let configPath: string;
  try {
    configPath = await resolvePageConfigJsonPath(workspaceRoot, route, fs);
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  let before = "";
  try {
    before = await fs.readFile(configPath);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException | null)?.code;
    if (code === "ENOENT")
      return { success: false as const, error: "not found" };
    return {
      success: false as const,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  let parsed: ReturnType<typeof parsePageConfigJson>;
  try {
    parsed = parsePageConfigJson(before);
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const elements = parsed.elements ?? [];
  const existingIds = extractAllIdsDeep(elements);
  ensureElementIds(elements, existingIds);

  return {
    success: true as const,
    configPath,
    elements,
    existingIds,
  };
};
