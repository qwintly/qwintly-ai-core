import path from "node:path";
import { toWorkspacePath } from "../helpers/fileSystem.helpers.js";
import {
  isAllowedRouteFilePath,
  isPageTsxPath,
  matchesPageTsxTemplate,
  normalizeFsPathForPolicy,
  PAGE_TSX_TEMPLATE,
} from "../helpers/nextRouteFilePolicy.js";
import { type WorkspaceDeps } from "./workspaceDeps.js";

export const createWriteFileImpl = (deps: WorkspaceDeps) => {
  const { workspaceRoot, fs } = deps;

  return async (filePath: string, content: string) => {
    const policyPath = normalizeFsPathForPolicy(filePath);
    if (!isAllowedRouteFilePath(policyPath)) {
      return {
        success: false,
        rejected: true,
        error:
          `write_file rejected: only route files named "page.tsx" or "page.config.ts" may be written.\n` +
          `Got: "${policyPath}"`,
        allowed: Array.from(["page.tsx", "page.config.ts"]),
      };
    }

    const fullPath = toWorkspacePath(workspaceRoot, filePath);
    console.log("Tool write_file", { path: fullPath });

    if (isPageTsxPath(policyPath)) {
      let exists = false;
      try {
        await fs.stat(fullPath);
        exists = true;
      } catch (err) {
        const code = (err as NodeJS.ErrnoException | null)?.code;
        if (code && code !== "ENOENT") {
          const message = err instanceof Error ? err.message : String(err);
          return {
            success: false,
            rejected: true,
            error: `write_file rejected: could not check existing file "${policyPath}": ${message}`,
          };
        }
      }

      if (exists) {
        return {
          success: false,
          rejected: true,
          error:
            `write_file rejected: updates to "page.tsx" are not allowed for any route. ` +
            `Only add (create) or delete is allowed, and once created it must never be edited.\n` +
            `Path: "${policyPath}"`,
          rule: "page.tsx is immutable after creation",
        };
      }

      if (!matchesPageTsxTemplate(content)) {
        return {
          success: false,
          rejected: true,
          error:
            `write_file rejected: new "page.tsx" must match the exact required template (byte-for-byte).\n` +
            `Path: "${policyPath}"\n` +
            `Expected:\n${PAGE_TSX_TEMPLATE}`,
          rule: "page.tsx must match template on creation",
        };
      }
    }

    await fs.mkdirp(path.dirname(fullPath));
    await fs.writeFile(fullPath, content ?? "");
    return { success: true };
  };
};
