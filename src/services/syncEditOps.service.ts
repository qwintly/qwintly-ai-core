import fs from "node:fs/promises";
import path from "node:path";
import type { BuilderElement } from "../types/elements.js";
import { ProjectOp, ProjectOperationRow } from "../types/projectOps.types.js";
import { PageConfig } from "../types/snapshot.js";

async function pathExists(p: string) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

function isRouteGroupSegment(segment: string) {
  return segment.startsWith("(") && segment.endsWith(")");
}

function routeFromAppDir(appRoot: string, dirAbsPath: string) {
  const rel = path.relative(appRoot, dirAbsPath);
  if (!rel || rel === ".") return "/";

  const parts = rel
    .split(path.sep)
    .filter(Boolean)
    .filter((seg) => {
      if (isRouteGroupSegment(seg)) return false;
      if (seg.startsWith("@")) return false; // parallel routes
      return true;
    });

  return `/${parts.join("/")}`;
}

async function walkDirs(rootAbs: string): Promise<string[]> {
  const dirs: string[] = [];
  const queue: string[] = [rootAbs];

  while (queue.length) {
    const current = queue.shift()!;
    dirs.push(current);

    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      queue.push(path.join(current, entry.name));
    }
  }

  return dirs;
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

async function writeJsonFile(filePath: string, value: unknown) {
  const out = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(filePath, out, "utf-8");
}

function findElementById(
  elements: BuilderElement[],
  id: string,
): { element: BuilderElement; parent: BuilderElement | null } | null {
  for (const element of elements) {
    if (!element || typeof element !== "object") continue;
    if (element.id === id) return { element, parent: null };

    const children = element.children;
    if (Array.isArray(children) && children.length) {
      const found = findElementById(children, id);
      if (found) return { element: found.element, parent: element };
    }
  }
  return null;
}

function removeElementById(elements: BuilderElement[], id: string): boolean {
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (!el || typeof el !== "object") continue;

    if (el.id === id) {
      elements.splice(i, 1);
      return true;
    }

    if (Array.isArray(el.children) && el.children.length) {
      const removed = removeElementById(el.children, id);
      if (removed) return true;
    }
  }

  return false;
}

function normalizeOps(value: unknown): ProjectOp[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as ProjectOp[];

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? (parsed as ProjectOp[]) : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeRoute(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export const applyOperations = async (
  ops: any,
  workspace: string,
): Promise<string[]> => {
  const appRoot = path.join(workspace, "app");
  if (!(await pathExists(appRoot))) return [];

  const rows: ProjectOperationRow[] = Array.isArray(ops) ? ops : [];
  if (rows.length === 0) return [];

  // Map route -> pageConfig.json path
  const routeToConfigPath = new Map<string, string>();
  const allDirs = await walkDirs(appRoot);
  for (const dirAbs of allDirs) {
    const pageTsx = path.join(dirAbs, "page.tsx");
    const pageConfigJson = path.join(dirAbs, "pageConfig.json");
    const hasPage = await pathExists(pageTsx);
    const hasConfig = await pathExists(pageConfigJson);
    if (!hasPage || !hasConfig) continue;

    const routeKey = routeFromAppDir(appRoot, dirAbs);
    routeToConfigPath.set(routeKey, pageConfigJson);
  }

  // Group ops per route so we only read/write each config once.
  const opsByRoute = new Map<string, { rowId: string; ops: ProjectOp[] }[]>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const rowId = typeof row.id === "string" ? row.id : "";
    if (!rowId) continue;
    const route = normalizeRoute((row as ProjectOperationRow).route);
    if (!route) continue;

    const list = normalizeOps((row as ProjectOperationRow).operation);
    if (list.length === 0) continue;

    const existing = opsByRoute.get(route) ?? [];
    existing.push({ rowId, ops: list });
    opsByRoute.set(route, existing);
  }

  const appliedIds = new Set<string>();

  for (const [route, entries] of opsByRoute) {
    const configPath = routeToConfigPath.get(route);
    if (!configPath) continue;

    let config: PageConfig;
    try {
      config = await readJsonFile<PageConfig>(configPath);
    } catch {
      continue;
    }

    if (!config || typeof config !== "object") continue;
    if (!Array.isArray(config.elements)) continue;

    let changed = false;

    for (const entry of entries) {
      let rowChanged = false;

      for (const op of entry.ops) {
        if (!op || typeof op !== "object") continue;
        const kind = (op as any).kind;

        if (kind === "text") {
          const id = (op as any).id;
          const newText = (op as any).newText;
          if (typeof id !== "string" || typeof newText !== "string") continue;

          const found = findElementById(config.elements, id);
          if (!found) continue;

          found.element.props = {
            ...(found.element.props ?? {}),
            text: newText,
          };
          changed = true;
          rowChanged = true;
          continue;
        }

        if (kind === "delete") {
          const id = (op as any).id;
          const parentId = (op as any).parentId;
          if (typeof id !== "string") continue;

          if (typeof parentId === "string" && parentId) {
            const parent = findElementById(config.elements, parentId)?.element;
            if (parent?.children && Array.isArray(parent.children)) {
              const before = parent.children.length;
              parent.children = parent.children.filter(
                (child) => child?.id !== id,
              );
              if (parent.children.length !== before) {
                changed = true;
                rowChanged = true;
              }
              continue;
            }
          }

          // Fallback: locate and remove by id anywhere in the tree (including top-level).
          if (removeElementById(config.elements, id)) {
            changed = true;
            rowChanged = true;
          }
        }
      }

      if (rowChanged) {
        appliedIds.add(entry.rowId);
      }
    }

    if (changed) {
      await writeJsonFile(configPath, config);
    }
  }

  return [...appliedIds];
};
