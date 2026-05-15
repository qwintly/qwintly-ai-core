import { nanoid } from "nanoid";
import { BuilderElement } from "../../../types/elements.js";

export function createElementId(existingIds: Set<string>) {
  let id: string;

  do {
    id = `el_${nanoid(10)}`;
  } while (existingIds.has(id));

  return id;
}

export function extractAllIds(elements: BuilderElement[]) {
  const ids = new Set<string>();
  elements.forEach((el) => {
    ids.add(el.id);
    if (el.children) {
      extractAllIds(el.children).forEach((id) => ids.add(id));
    }
  });
  return ids;
}
