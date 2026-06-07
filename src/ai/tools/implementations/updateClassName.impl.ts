import {
  findElementById,
  loadAndPreparePageConfig,
  stringifyPageConfigJson,
  writeFileAtomic,
} from "../helpers/pageConfigJson.helpers.js";
import { type WorkspaceDeps } from "./workspaceDeps.js";

export const createUpdateClassNameImpl = (deps: WorkspaceDeps) => {
  const { workspaceRoot, fs } = deps;

  return async (route: string, elementId: string, className: string) => {
    const id = String(elementId ?? "").trim();
    if (!id) return { success: false, error: "invalid element_id" };

    const prep = await loadAndPreparePageConfig(workspaceRoot, route, fs);
    if (!prep.success) return prep;

    const { configPath, elements } = prep;

    const el = findElementById(elements, id);
    if (!el) return { success: false, error: "element not found" };

    (el as any).className = String(className ?? "");

    const after = stringifyPageConfigJson({ elements });
    try {
      await writeFileAtomic(configPath, after);
      return { success: true, changed: true, updated_id: id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  };
};
