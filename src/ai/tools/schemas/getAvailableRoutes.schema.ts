import { Type } from "@google/genai";

export const GetAvailableRoutesSchema = {
  name: "get_available_routes",
  description: "Get all available routes in the project.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};
