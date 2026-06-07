import { extractPatchFiles, sha256Hex } from "./fsHelpers.js";

export const getApplyPatchEventMeta = (args: Record<string, unknown>) => {
  const patch = typeof args.patch_string === "string" ? args.patch_string : "";
  return {
    chars: patch.length,
    sha256: sha256Hex(patch),
    files: extractPatchFiles(patch),
  };
};
