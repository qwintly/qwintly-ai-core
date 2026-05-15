import { Type } from "@google/genai";

export const CreateNewRouteSchema = {
  name: "create_new_route",
  description:
    "Creates a new Next.js App Router route folder under /app/<parent_route>/<route_name> with a page.tsx and pageConfig.json.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      parent_route: {
        type: Type.STRING,
        description: 'The parent route ("/" for app root). Example: "/" or "/dashboard".',
      },
      route_name: {
        type: Type.STRING,
        description:
          'The new route segment to create under the parent route. Example: "about" or "settings".',
      },
    },
    required: ["parent_route", "route_name"],
  },
};
