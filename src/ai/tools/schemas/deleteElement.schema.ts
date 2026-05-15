import { Type } from "@google/genai";

export const DeleteElementSchema = {
  name: "delete_element",
  description: "Deletes element code.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      route: {
        type: Type.STRING,
        description:
          "The route to delete the element at. Example. '/' or '/about' etc.",
      },
      element_id: {
        type: Type.STRING,
        description: "The id of the element to be deleted.",
      },
    },
    required: ["route", "element_id"],
  },
};
