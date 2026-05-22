import { Type } from "@google/genai";
import { STYLE_TOKEN_KEYS } from "../../../types/styleConfig.js";

export const UpdateGlobalStylesSchema = {
  name: "update_global_styles",
  description:
    "Updates global design tokens in app/styleConfig.json. Use this to change theme colors/radius used by semantic Tailwind classes like bg-background and text-foreground.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      tokens: {
        type: Type.OBJECT,
        description:
          `Args must be exactly: {"tokens": {"<tokenKey>":"<cssString>", ...}}. ` +
          `Partial tokens patch (must include at least 1 key; never {"tokens":{}}). Allowed keys: ${STYLE_TOKEN_KEYS.join(
            ", ",
          )}. Values must be non-empty safe CSS strings (e.g. '0.75rem' or 'oklch(0.62 0.16 199.4)'). Unknown keys are rejected.`,
        minProperties: "1",
        additionalProperties: { type: Type.STRING },
      },
    },
    required: ["tokens"],
  },
};
