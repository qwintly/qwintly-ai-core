import { resolveUnsplashImagesDeep } from "../../../image/unsplash.service.js";
import type { BuilderElement } from "../../../types/elements.js";
import {
  ensureElementIds,
  extractAllIdsDeep,
  findElementById,
  getPageConfigJsonPath,
  parsePageConfigJson,
  stringifyPageConfigJson,
  writeFileAtomic,
} from "../helpers/pageConfigJson.helpers.js";
import { InsertElementArgsZod } from "../validators/builderElement.zod.js";
import { type WorkspaceDeps } from "./workspaceDeps.js";

export const createInsertElementImpl = (deps: WorkspaceDeps) => {
  const { workspaceRoot, fs } = deps;

  return async (
    routeOrArgs: string | Record<string, unknown>,
    parentId?: string,
    element?: BuilderElement,
    beforeId?: string,
  ) => {
    const rawArgs =
      typeof routeOrArgs === "object" && routeOrArgs !== null
        ? (routeOrArgs as Record<string, unknown>)
        : {
            route: routeOrArgs,
            parent_id: parentId,
            before_id: beforeId,
            element,
          };

    const parsedArgs = InsertElementArgsZod.safeParse(rawArgs);
    if (!parsedArgs.success) {
      return {
        success: false,
        error: "invalid args",
        error_detail: parsedArgs.error.flatten(),
      };
    }

    const parent_id = String(parsedArgs.data.parent_id ?? "").trim();
    if (!parent_id) return { success: false, error: "invalid parent_id" };

    const before_id = String(parsedArgs.data.before_id ?? "").trim();

    let configPath: string;
    try {
      configPath = getPageConfigJsonPath(workspaceRoot, parsedArgs.data.route);
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    let before = "";
    try {
      before = await fs.readFile(configPath);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException | null)?.code;
      if (code === "ENOENT") return { success: false, error: "not found" };
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    let parsed: ReturnType<typeof parsePageConfigJson>;
    try {
      parsed = parsePageConfigJson(before);
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    const elements = parsed.elements ?? [];
    const existingIds = extractAllIdsDeep(elements);
    ensureElementIds(elements, existingIds);

    // Clone + inject ids for the inserted element subtree.
    const toInsert = JSON.parse(
      JSON.stringify(parsedArgs.data.element ?? null),
    ) as BuilderElement;
    await resolveUnsplashImagesDeep(toInsert);
    ensureElementIds([toInsert], existingIds);

    const parent = findElementById(elements, parent_id);
    if (!parent) return { success: false, error: "parent not found" };

    const anyParent = parent as any;
    if (!anyParent.children || !Array.isArray(anyParent.children))
      anyParent.children = [];

    const children = anyParent.children as BuilderElement[];
    if (before_id) {
      const idx = children.findIndex((c: any) => String(c?.id ?? "") === before_id);
      if (idx >= 0) {
        children.splice(idx, 0, toInsert);
      } else {
        children.push(toInsert);
      }
    } else {
      children.push(toInsert);
    }

    const after = stringifyPageConfigJson({ elements });
    try {
      await writeFileAtomic(configPath, after);
      return {
        success: true,
        changed: true,
        inserted_id: (toInsert as any).id,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  };
};
