import {
  deleteElementById,
  loadAndPreparePageConfig,
  stringifyPageConfigJson,
  writeFileAtomic,
} from "../helpers/pageConfigJson.helpers.js";
import { type WorkspaceDeps } from "./workspaceDeps.js";

export const createDeleteElementImpl = (deps: WorkspaceDeps) => {
  const { workspaceRoot, fs } = deps;

  return async (route: string, elementId: string) => {
    const id = String(elementId ?? "").trim();
    if (!id) return { success: false, error: "invalid element_id" };

    const prep = await loadAndPreparePageConfig(workspaceRoot, route, fs);
    if (!prep.success) return prep;

    const { configPath, elements } = prep;

    const isRoot = elements.some((el) => el?.id === id);
    if (isRoot) {
      return { success: false, error: "Cannot delete the root element" };
    }

    const deleted = deleteElementById(elements, id);
    if (!deleted) return { success: true, changed: false };

    const after = stringifyPageConfigJson({ elements });

    try {
      await writeFileAtomic(configPath, after);
      return { success: true, changed: true, deleted_id: id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  };
};
