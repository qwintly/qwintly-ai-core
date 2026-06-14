import { resolveUnsplashImagesDeep } from "../../../image/unsplash.service.js";
import type { BuilderElement } from "../../../types/elements.js";
import {
  ensureElementIds,
  findElementById,
  loadAndPreparePageConfig,
  stringifyPageConfigJson,
  writeFileAtomic,
} from "../helpers/pageConfigJson.helpers.js";
import { InsertElementArgsZod } from "../validators/builderElement.zod.js";
import { type WorkspaceDeps } from "./workspaceDeps.js";

function reconstructTree(flatElements: any[], parentId: string): BuilderElement[] {
  const rootFlats = flatElements.filter((el) => el.parentId === parentId);
  if (rootFlats.length === 0) {
    throw new Error(`No root element found with parentId '${parentId}'`);
  }

  const buildMap = new Map<string, any>();
  for (const flat of flatElements) {
    buildMap.set(flat.id, {
      type: flat.type,
      className: flat.className,
      visible: flat.visible,
      props: flat.props ? structuredClone(flat.props) : undefined,
      children: [],
    });
  }

  for (const flat of flatElements) {
    if (flat.parentId === parentId) {
      continue;
    }
    const parentNode = buildMap.get(flat.parentId);
    if (!parentNode) {
      throw new Error(
        `Parent element with id '${flat.parentId}' not found in the list. Please read the file using read_file tool to see the valid parent ids available. DO NOT do insert with same args without calling read_file tool.`,
      );
    }
    const currentNode = buildMap.get(flat.id);
    if (currentNode) {
      if (!parentNode.children) {
        parentNode.children = [];
      }
      parentNode.children.push(currentNode);
    }
  }

  return rootFlats.map((rootFlat) => buildMap.get(rootFlat.id));
}

export const createInsertElementImpl = (deps: WorkspaceDeps) => {
  const { workspaceRoot, fs } = deps;

  return async (
    routeOrArgs: string | Record<string, unknown>,
    parentId?: string,
    inputElements?: any[],
    beforeId?: string,
  ) => {
    const rawArgs =
      typeof routeOrArgs === "object" && routeOrArgs !== null
        ? (routeOrArgs)
        : {
            route: routeOrArgs,
            parent_id: parentId,
            before_id: beforeId,
            elements: inputElements,
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

    const prep = await loadAndPreparePageConfig(workspaceRoot, parsedArgs.data.route, fs);
    if (!prep.success) return prep;

    const { configPath, elements, existingIds } = prep;

    // Clone + inject ids for the inserted element subtree.
    let toInsert: BuilderElement[];
    try {
      toInsert = reconstructTree(parsedArgs.data.elements, parent_id);
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    for (const el of toInsert) {
      await resolveUnsplashImagesDeep(el);
    }
    ensureElementIds(toInsert, existingIds);

    if (elements.length === 0) {
      elements.push(...toInsert);
    } else {
      const parent = findElementById(elements, parent_id);
      if (!parent) return { success: false, error: "parent not found" };

      const anyParent = parent as any;
      if (!anyParent.children || !Array.isArray(anyParent.children))
        anyParent.children = [];

      const children = anyParent.children as BuilderElement[];
      const idx = before_id ? children.findIndex((c: any) => String(c?.id ?? "") === before_id) : -1;
      if (idx >= 0) {
        children.splice(idx, 0, ...toInsert);
      } else {
        children.push(...toInsert);
      }
    }

    const after = stringifyPageConfigJson({ elements });
    try {
      await writeFileAtomic(configPath, after);
      return {
        success: true,
        changed: true,
        inserted_id: (toInsert[0] as any).id,
        inserted_ids: toInsert.map((el: any) => el.id),
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  };
};
