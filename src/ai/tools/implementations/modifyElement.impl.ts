import { resolveUnsplashImagesDeep, resolveUnsplashImageForElement } from "../../../image/unsplash.service.js";
import type { BuilderElement } from "../../../types/elements.js";
import {
  ensureElementIds,
  findElementById,
  deleteElementById,
  loadAndPreparePageConfig,
  stringifyPageConfigJson,
  writeFileAtomic,
} from "../helpers/pageConfigJson.helpers.js";
import { ModifyElementArgsZod } from "../validators/builderElement.zod.js";
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

const applyPropsPatch = (el: BuilderElement, patch: any) => {
  const anyEl = el as any;
  if (!anyEl.props || typeof anyEl.props !== "object") anyEl.props = {};

  const apply = (key: string, value: unknown) => {
    if (value === undefined || value === null) return;
    anyEl.props[key] = value;
  };

  apply("onClick", patch.onClick);
  apply("text", patch.text);
  apply("href", patch.href);
  apply("placeholder", patch.placeholder);
  apply("alt", patch.alt);
  apply("target", patch.target);
  apply("rel", patch.rel);
  apply("value", patch.value);
  apply("type", patch.type);

  apply("name", patch.name);
  apply("size", patch.size);
  apply("color", patch.color);
  apply("strokeWidth", patch.strokeWidth);
};

export const createModifyElementImpl = (deps: WorkspaceDeps) => {
  const { workspaceRoot, fs } = deps;

  return async (args: Record<string, unknown>) => {
    const parsedArgs = ModifyElementArgsZod.safeParse(args);
    if (!parsedArgs.success) {
      return {
        success: false,
        error: "invalid args",
        error_detail: parsedArgs.error.flatten(),
      };
    }

    const { action, route } = parsedArgs.data;

    const prep = await loadAndPreparePageConfig(workspaceRoot, route, fs);
    if (!prep.success) return prep;

    const { configPath, elements, existingIds } = prep;

    let changed = false;
    let resultPayload: Record<string, unknown> = {};

    switch (action) {
      case "insert": {
        const { parent_id, before_id, elements: inputElements } = parsedArgs.data;
        const parentIdStr = String(parent_id ?? "").trim();
        if (!parentIdStr) return { success: false, error: "invalid parent_id" };

        const beforeIdStr = String(before_id ?? "").trim();

        let toInsert: BuilderElement[];
        try {
          toInsert = reconstructTree(inputElements, parentIdStr);
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
          const parent = findElementById(elements, parentIdStr);
          if (!parent) return { success: false, error: "parent not found" };

          const anyParent = parent as any;
          if (!anyParent.children || !Array.isArray(anyParent.children))
            anyParent.children = [];

          const children = anyParent.children as BuilderElement[];
          const idx = beforeIdStr ? children.findIndex((c: any) => String(c?.id ?? "") === beforeIdStr) : -1;
          if (idx >= 0) {
            children.splice(idx, 0, ...toInsert);
          } else {
            children.push(...toInsert);
          }
        }

        changed = true;
        resultPayload = {
          inserted_id: (toInsert[0] as any).id,
          inserted_ids: toInsert.map((el: any) => el.id),
        };
        break;
      }

      case "delete": {
        const { element_id } = parsedArgs.data;
        const elementIdStr = String(element_id ?? "").trim();
        if (!elementIdStr) return { success: false, error: "invalid element_id" };

        const isRoot = elements.some((el) => el?.id === elementIdStr);
        if (isRoot) {
          return { success: false, error: "Cannot delete the root element" };
        }

        const deleted = deleteElementById(elements, elementIdStr);
        if (deleted) {
          changed = true;
          resultPayload = { deleted_id: elementIdStr };
        }
        break;
      }

      case "update_classname": {
        const { element_id, className } = parsedArgs.data;
        const elementIdStr = String(element_id ?? "").trim();
        if (!elementIdStr) return { success: false, error: "invalid element_id" };

        const el = findElementById(elements, elementIdStr);
        if (!el) return { success: false, error: "element not found" };

        const class_name = String(className ?? "");
        if ((el as any).className !== class_name) {
          (el as any).className = class_name;
          changed = true;
        }
        resultPayload = { updated_id: elementIdStr };
        break;
      }

      case "update_props": {
        const { element_id, props, ...flatProps } = parsedArgs.data;
        const elementIdStr = String(element_id ?? "").trim();
        if (!elementIdStr) return { success: false, error: "invalid element_id" };

        const el = findElementById(elements, elementIdStr);
        if (!el) return { success: false, error: "element not found" };

        const mergedProps = {
          ...(typeof props === "object" && props !== null ? props : {}),
          ...flatProps,
        };

        applyPropsPatch(el, mergedProps);

        if (el.type === "image") {
          const anyEl = el as any;
          const alt = String(mergedProps.alt ?? anyEl?.props?.alt ?? "").trim();
          await resolveUnsplashImageForElement(el, alt);
        }

        changed = true;
        resultPayload = { updated_id: elementIdStr };
        break;
      }
    }

    if (changed) {
      const after = stringifyPageConfigJson({ elements });
      try {
        await writeFileAtomic(configPath, after);
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    return {
      success: true,
      changed,
      ...resultPayload,
    };
  };
};
