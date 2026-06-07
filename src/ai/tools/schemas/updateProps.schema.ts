import { Type } from "@google/genai";
import { BuilderElementPropsSchema } from "./elementProps.schema.js";

export const UpdatePropsSchema = {
  name: "update_props",
  description: "Updates element code.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      route: {
        type: Type.STRING,
        pattern: String.raw`^(?:/(?:[A-Za-z0-9_.[\\\]-]+(?:/[A-Za-z0-9_.[\\\]-]+)*)?|[A-Za-z0-9_.[\\\]-]+(?:/[A-Za-z0-9_.[\\\]-]+)*)$`,
        description:
          "The route to update the element at. Example: '/' or '/about'. If you forget the leading '/', it will be assumed (e.g. 'about' -> '/about').",
      },
      element_id: {
        type: Type.STRING,
        description: "The id of the element to be updated.",
      },
      ...BuilderElementPropsSchema.properties,
    },
    required: ["route", "element_id"],
  },
};
