import { resolveUnsplashImageForElement } from "../../../image/unsplash.service.js";
import type { BuilderElement, OnClickAction } from "../../../types/elements.js";
import {
  findElementById,
  loadAndPreparePageConfig,
  stringifyPageConfigJson,
  writeFileAtomic,
} from "../helpers/pageConfigJson.helpers.js";
import { type WorkspaceDeps } from "./workspaceDeps.js";

type UpdatePropsArgs = {
  route: string;
  element_id: string;
} & Partial<{
  onClick: OnClickAction;
  text: string;
  href: string;
  placeholder: string;
  alt: string;
  target: string;
  rel: string;
  value: string;
  type: string;
  name: string;
  size: number;
  color: string;
  strokeWidth: number;
}>;

const applyPropsPatch = (el: BuilderElement, patch: UpdatePropsArgs) => {
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

export const createUpdatePropsImpl = (deps: WorkspaceDeps) => {
  const { workspaceRoot, fs } = deps;

  return async (args: UpdatePropsArgs) => {
    const id = String(args?.element_id ?? "").trim();
    if (!id) return { success: false, error: "invalid element_id" };

    const prep = await loadAndPreparePageConfig(workspaceRoot, args.route, fs);
    if (!prep.success) return prep;

    const { configPath, elements } = prep;

    const el = findElementById(elements, id);
    if (!el) return { success: false, error: "element not found" };

    applyPropsPatch(el, args);

    if (el.type === "image") {
      const anyEl = el as any;
      const alt = String(args.alt ?? anyEl?.props?.alt ?? "").trim();
      await resolveUnsplashImageForElement(el, alt);
    }

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
