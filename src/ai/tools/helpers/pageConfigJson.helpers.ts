import fs from "node:fs/promises";
import path from "node:path";
import type { BuilderElement } from "../../../types/elements.js";
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
    await fs.rename(filePath, bak);
    await fs.rename(tmp, filePath);
    await fs.rm(bak, { force: true });
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
