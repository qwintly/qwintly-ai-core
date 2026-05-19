import { resolveUnsplashImagesDeep } from "../../../image/unsplash.service.js";
import type { BuilderElement } from "../../../types/elements.js";
import { InsertElementArgsZod } from "../validators/builderElement.zod.js";
import {
  ensureElementIds,
  extractAllIdsDeep,
  findElementById,
  getPageConfigJsonPath,
  parsePageConfigJson,
  stringifyPageConfigJson,
  writeFileAtomic,
} from "../helpers/pageConfigJson.helpers.js";
import { type WorkspaceDeps } from "./workspaceDeps.js";

export const createInsertElementImpl = (deps: WorkspaceDeps) => {
  const { workspaceRoot, fs } = deps;

  return async (route: string, parentId: string, element: BuilderElement) => {
    const parsedArgs = InsertElementArgsZod.safeParse({
      route,
      parent_id: parentId,
      element,
    });
    if (!parsedArgs.success) {
      return {
        success: false,
        error: "invalid args",
        error_detail: parsedArgs.error.flatten(),
      };
    }

    const parent_id = String(parentId ?? "").trim();
    if (!parent_id) return { success: false, error: "invalid parent_id" };

    let configPath: string;
    try {
      configPath = getPageConfigJsonPath(workspaceRoot, route);
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
      JSON.stringify(element ?? null),
    ) as BuilderElement;
    await resolveUnsplashImagesDeep(toInsert);
    ensureElementIds([toInsert], existingIds);

    const parent = findElementById(elements, parent_id);
    if (!parent) return { success: false, error: "parent not found" };

    const anyParent = parent as any;
    if (!anyParent.children || !Array.isArray(anyParent.children))
      anyParent.children = [];
    (anyParent.children as BuilderElement[]).push(toInsert);

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
