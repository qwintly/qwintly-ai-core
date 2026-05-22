import { Type } from "@google/genai";

export const DeleteElementSchema = {
  name: "delete_element",
  description: "Deletes element code.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      route: {
        type: Type.STRING,
        // Accept both "/about" and "about" (caller might omit the leading slash).
        pattern:
          "^(?:/(?:[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*)?)|(?:[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*)$)",
        description:
          "The route to delete the element at. Example: '/' or '/about'. If you forget the leading '/', it will be assumed (e.g. 'about' -> '/about').",
      },
      element_id: {
        type: Type.STRING,
        description: "The id of the element to be deleted.",
      },
    },
    required: ["route", "element_id"],
  },
};
