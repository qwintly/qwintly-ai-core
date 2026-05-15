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

export const createUpdateClassNameImpl = (deps: WorkspaceDeps) => {
  const { workspaceRoot, fs } = deps;

  return async (route: string, elementId: string, className: string) => {
    const id = String(elementId ?? "").trim();
    if (!id) return { success: false, error: "invalid element_id" };

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
