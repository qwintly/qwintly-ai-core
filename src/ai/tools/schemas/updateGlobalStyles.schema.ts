import { Type } from "@google/genai";
import { STYLE_TOKEN_KEYS } from "../../../types/styleConfig.js";

export const UpdateGlobalStylesSchema = {
  name: "update_global_styles",
  description:
    "Updates global design tokens in app/styleConfig.json. Use this to change theme colors/radius used by semantic Tailwind classes like bg-background and text-foreground.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      ...Object.fromEntries(
        STYLE_TOKEN_KEYS.map((k) => [
          k,
          {
            type: Type.STRING,
            description:
              "CSS value string for this token (e.g. '0.75rem' or 'oklch(0.62 0.16 199.4)'). Omit keys you don't want to change.",
          },
        ]),
      ),
    },
    description:
      `Args are a flat object where each key is an optional token name; include at least 1 key. Use background for background color and foreground for text color, radius for border radius, etc.` +
      `Allowed keys: ${STYLE_TOKEN_KEYS.join(", ")}.`,
  },
};
