import { Type } from "@google/genai";

export const WriteFileSchema = {
  name: "write_file",
  description:
    'Writes full file content to the given path within the workspace (overwrites existing file). ' +
    'Policy: only "page.config.ts" and "page.tsx" route files are allowed. ' +
    '"page.tsx" can only be created with the exact required template and must never be edited after creation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: {
        type: Type.STRING,
        description:
          'Absolute or workspace-relative path to the file to write (must be within the workspace). ' +
          'Must end with "page.config.ts" or "page.tsx".',
      },
      content: {
        type: Type.STRING,
        description:
          'Complete file contents to write. For "page.tsx" creation, this must match the required template exactly.',
      },
    },
    required: ["path", "content"],
  },
};
