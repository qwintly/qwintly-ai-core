import { Type } from "@google/genai";
import { BuilderElementPropsSchema } from "./elementProps.schema.js";

export const ELEMENT_TYPES = [
  "fragment",
  "div",
  "text",
  "image",
  "button",
  "input",
  "textarea",
  "link",
  "icon",
] as const;

export const ModifyElementSchema = {
  name: "modify_element",
  description:
    "Modifies elements in the page config. Supports inserting elements, updating element className, updating element props, or deleting an element.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      route: {
        type: Type.STRING,
        pattern: String.raw`^(?:/(?:[A-Za-z0-9_.[\\\]-]+(?:/[A-Za-z0-9_.[\\\]-]+)*)?|[A-Za-z0-9_.[\\\]-]+(?:/[A-Za-z0-9_.[\\\]-]+)*)$`,
        description:
          "The route to modify the element at. Use URL paths with forward slashes only. Examples: '/', '/about', '/pricing'. If you forget the leading '/', it will be assumed (e.g. 'about' -> '/about'). Never send Windows-style backslashes (e.g. '\\\\') or filesystem paths like 'app/pricing'. Never send empty string.",
      },
      action: {
        type: Type.STRING,
        enum: ["insert", "update_props", "update_classname", "delete"],
        description: "The action to perform: 'insert', 'update_props', 'update_classname', or 'delete'.",
      },
      element_id: {
        type: Type.STRING,
        description: "The ID of the element to modify. Required for 'delete', 'update_props', and 'update_classname'.",
      },
      parent_id: {
        type: Type.STRING,
        description: "Required for 'insert'. The parent ID to insert the element tree under.",
      },
      before_id: {
        type: Type.STRING,
        description:
          "Optional for 'insert'. If provided, inserts the new root elements before the existing child element with this id (within parent_id's children list). If not found, appends at the end.",
      },
      elements: {
        type: Type.ARRAY,
        description:
          "Required for 'insert'. Flat array of elements that form a tree. One or more elements must have parentId matching the parent_id parameter to attach directly under the parent_id as siblings. Subsequent child elements should have parentId matching the temporary id of their parent in this array.",
        items: {
          type: Type.OBJECT,
          properties: {
            id: {
              type: Type.STRING,
              description: "A unique temporary ID for this element (e.g. 'root_sec', 'card_bg', 'btn_cta') to refer to it in parentId.",
            },
            parentId: {
              type: Type.STRING,
              description: "The temporary ID of the parent element in this list, or matching parent_id to insert directly under the page's parent_id.",
            },
            type: {
              type: Type.STRING,
              enum: ELEMENT_TYPES,
              description:
                "Element type to render. Use 'text' for <p>, 'image' for <img>, 'link' for <a>, 'icon' for Lucide icon, 'fragment' renders children only",
            },
            className: {
              type: Type.STRING,
              description: "Tailwind CSS className (Tailwind only)",
            },
            visible: {
              type: Type.BOOLEAN,
              description: "Visibility flag",
            },
            props: BuilderElementPropsSchema,
          },
          required: ["id", "parentId", "type"],
        },
      },
      className: {
        type: Type.STRING,
        description: "Required for 'update_classname'. Tailwind CSS className (only tailwind classes allowed). Give complete className. Prefer semantic token classes (bg-background, text-foreground, border-border, ring-ring, etc.); use update_global_styles to change global tokens.",
      },
      props: BuilderElementPropsSchema,
    },
    required: ["route", "action"],
  },
};
