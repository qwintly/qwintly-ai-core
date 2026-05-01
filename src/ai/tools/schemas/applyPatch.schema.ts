import { Type } from "@google/genai";

export const ApplyPatchSchema = {
  name: "apply_patch",
  description:
    'Applies a diff patch to a file or set of files. Policy: only "page.config.ts" and "page.tsx" route files are allowed. ' +
    '"page.tsx" can only be added with the exact required template; updates to "page.tsx" are rejected (only add/delete).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      patch_string: {
        type: Type.STRING,
        description: "The patch string to apply (*** Begin Patch ... *** End Patch).",
      },
    },
    required: ["patch_string"],
  },
};
