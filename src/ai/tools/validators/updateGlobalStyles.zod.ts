import { z } from "zod";
import { STYLE_TOKEN_KEYS, type StyleTokenKey } from "../../../types/styleConfig.js";

const allowedKeys = STYLE_TOKEN_KEYS as unknown as StyleTokenKey[];

export const UpdateGlobalStylesArgsZod = z
  .object(
    Object.fromEntries(
      allowedKeys.map((k) => [
        k,
        z
          .string()
          .transform((v) => v.trim())
          .refine((v) => v.length > 0, "must be non-empty")
          .optional(),
      ]),
    ) as unknown as Record<string, z.ZodTypeAny>,
  )
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "must include at least one token key/value",
  });
