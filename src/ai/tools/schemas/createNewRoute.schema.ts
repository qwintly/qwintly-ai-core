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
        // Accept both "/dashboard" and "dashboard" (caller might omit the leading slash).
        pattern: String.raw`^(?:/|/(?:[A-Za-z0-9_.[\\\]-]+(?:/[A-Za-z0-9_.[\\\]-]+)*)?|[A-Za-z0-9_.[\\\]-]+(?:/[A-Za-z0-9_.[\\\]-]+)*)$`,
        description:
          'The parent route ("/" for app root). Example: "/" or "/dashboard". If you forget the leading "/", it will be assumed (e.g. "dashboard" -> "/dashboard"). NEVER pass empty string, use "/" if not sure about parent route.',
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
