import { Type } from "@google/genai";

export const UpdateClassNameSchema = {
  name: "update_classname",
  description:
    "Updates className (only tailwind classes allowed). Give complete className.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      route: {
        type: Type.STRING,
        description:
          "The route to update the element at. Example. '/' or '/about' etc.",
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
