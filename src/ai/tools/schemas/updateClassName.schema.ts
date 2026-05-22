import { Type } from "@google/genai";

export const UpdateClassNameSchema = {
  name: "update_classname",
  description:
    "Updates className (only tailwind classes allowed). Give complete className. Prefer semantic token classes (bg-background, text-foreground, border-border, ring-ring, etc.); use update_global_styles to change global tokens.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      route: {
        type: Type.STRING,
        // Accept both "/about" and "about" (caller might omit the leading slash).
        pattern:
          "^(?:/(?:[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*)?)|(?:[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*)$)",
        description:
          "The route to update the element at. Example: '/' or '/about'. If you forget the leading '/', it will be assumed (e.g. 'about' -> '/about').",
      },
      element_id: {
        type: Type.STRING,
        description: "The id of the element to be updated.",
      },
      className: { type: Type.STRING },
    },
    required: ["route", "element_id", "className"],
  },
};
