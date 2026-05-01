import path from "node:path";
import { applyHunksToContent, isTextFilePath, parseApplyPatch } from "../helpers/applyPatch.helpers.js";
import { toWorkspacePath } from "../helpers/fileSystem.helpers.js";
import {
  isAllowedRouteFilePath,
  isPageTsxPath,
  matchesPageTsxTemplate,
  normalizeFsPathForPolicy,
  PAGE_TSX_TEMPLATE,
} from "../helpers/nextRouteFilePolicy.js";
import { type WorkspaceDeps } from "./workspaceDeps.js";

export const createApplyPatchImpl = (deps: WorkspaceDeps) => {
  const { workspaceRoot, fs } = deps;

  return async (patchString: string) => {
    let parsedOps: ReturnType<typeof parseApplyPatch> | null = null;
    const debugFiles: Array<{ path: string; head: string }> = [];

    const HEAD_MAX_LINES = 80;

    const headLines = (content: string) =>
      content.replace(/\r\n/g, "\n").split("\n").slice(0, HEAD_MAX_LINES).join("\n");

    const addDebugSnapshot = async (filePath: string, label?: string) => {
      if (!filePath) return;
      if (debugFiles.length >= 3) return;
      if (debugFiles.some((f) => f.path === filePath)) return;

      try {
        const absolute = toWorkspacePath(workspaceRoot, filePath);
        try {
          await fs.stat(absolute);
          const content = await fs.readFile(absolute);
          debugFiles.push({
            path: filePath,
            head: `${label ? `${label}\n` : ""}${headLines(content)}`,
          });
        } catch (err) {
          const code = (err as NodeJS.ErrnoException | null)?.code;
          const suffix = code === "ENOENT" ? "(not found)" : "(unreadable)";
          debugFiles.push({ path: filePath, head: `${label ? `${label} ` : ""}${suffix}` });
        }
      } catch {
        debugFiles.push({ path: filePath, head: `${label ? `${label} ` : ""}(invalid path)` });
      }
    };

    const extractPatchPaths = (patch: string) => {
      const out: string[] = [];
      const seen = new Set<string>();
      const normalized = (patch ?? "").replace(/\r\n/g, "\n");
      for (const line of normalized.split("\n")) {
        const match =
          /^\*\*\* (Update File|Add File|Delete File):\s+(.+)$/.exec(line.trim()) ??
          /^\*\*\* Move to:\s+(.+)$/.exec(line.trim());
        if (!match) continue;
        const p = (match[2] ?? match[1] ?? "").trim();
        if (!p || seen.has(p)) continue;
        seen.add(p);
        out.push(p);
        if (out.length >= 10) break;
      }
      return out;
    };

    try {
      const operations = parseApplyPatch(patchString);
      parsedOps = operations;

      for (const op of operations) {
        const opPath = normalizeFsPathForPolicy(op.filePath);
        if (!isAllowedRouteFilePath(opPath)) {
          return {
            success: false,
            rejected: true,
            error:
              `apply_patch rejected: only route files named "page.tsx" or "page.config.ts" may be modified.\n` +
              `Found operation on: "${opPath}"`,
            allowed: Array.from(["page.tsx", "page.config.ts"]),
          };
        }

        if (op.kind === "update" && op.moveTo && op.moveTo !== op.filePath) {
          const moveToPath = normalizeFsPathForPolicy(op.moveTo);
          if (!isAllowedRouteFilePath(moveToPath)) {
            return {
              success: false,
              rejected: true,
              error:
                `apply_patch rejected: move target must be a route file named "page.tsx" or "page.config.ts".\n` +
                `From: "${opPath}"\n` +
                `To: "${moveToPath}"`,
              allowed: Array.from(["page.tsx", "page.config.ts"]),
            };
          }

          const fromName = opPath.split("/").pop() ?? "";
          const toName = moveToPath.split("/").pop() ?? "";
          if (fromName !== toName) {
            return {
              success: false,
              rejected: true,
              error:
                `apply_patch rejected: renaming between route file types is not allowed.\n` +
                `From: "${opPath}"\n` +
                `To: "${moveToPath}"`,
            };
          }
        }

        if (isPageTsxPath(opPath)) {
          if (op.kind === "update") {
            return {
              success: false,
              rejected: true,
              error:
                `apply_patch rejected: updates to "page.tsx" are not allowed for any route. ` +
                `Only Add File (create) or Delete File is allowed.\n` +
                `Path: "${opPath}"`,
              rule: "page.tsx is immutable after creation",
            };
          }

          if (op.kind === "add") {
            const { content: after } = applyHunksToContent("", op.hunks);
            if (!matchesPageTsxTemplate(after)) {
              return {
                success: false,
                rejected: true,
                error:
                  `apply_patch rejected: new "page.tsx" must match the exact required template (byte-for-byte).\n` +
                  `Path: "${opPath}"\n` +
                  `Expected:\n${PAGE_TSX_TEMPLATE}`,
                rule: "page.tsx must match template on creation",
              };
            }
          }
        }
      }

      let changed = false;
      const warnings: string[] = [];

      for (const op of operations) {
        if (!isTextFilePath(op.filePath)) {
          throw new Error(`Binary or unsupported file type in patch: "${op.filePath}"`);
        }
        if (op.kind === "update" && op.moveTo && !isTextFilePath(op.moveTo)) {
          throw new Error(`Binary or unsupported file type in patch: "${op.moveTo}"`);
        }

        const fullPath = toWorkspacePath(workspaceRoot, op.filePath);

        if (op.kind === "delete") {
          console.log("Tool apply_patch (delete)", { path: fullPath });
          try {
            await fs.rmFile(fullPath);
            changed = true;
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            throw new Error(`Delete File failed for "${op.filePath}": ${message}`);
          }
          continue;
        }

        if (op.kind === "add") {
          console.log("Tool apply_patch (add)", { path: fullPath });
          try {
            const { content: after, changed: opChanged } = applyHunksToContent(
              "",
              op.hunks,
            );
            await fs.mkdirp(path.dirname(fullPath));
            await fs.writeFile(fullPath, after);
            if (!opChanged) warnings.push(`Add File produced no changes for "${op.filePath}".`);
            changed = changed || opChanged;
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            throw new Error(`Add File failed for "${op.filePath}": ${message}`);
          }
          continue;
        }

        if (op.kind === "update") {
          console.log("Tool apply_patch (update)", { path: fullPath });
          try {
            try {
              await fs.stat(fullPath);
            } catch (err) {
              const code = (err as NodeJS.ErrnoException | null)?.code;
              if (code === "ENOENT") {
                throw new Error(`"${op.filePath}" not found.`);
              }
              throw err;
            }

            const before = await fs.readFile(fullPath);
            await addDebugSnapshot(op.filePath, `BEFORE (${op.filePath}):`);

            const { content: after, changed: contentChanged } = applyHunksToContent(
              before,
              op.hunks,
            );

            if (op.moveTo && op.moveTo !== op.filePath) {
              const moveToPath = toWorkspacePath(workspaceRoot, op.moveTo);
              console.log("Tool apply_patch (move)", {
                from: fullPath,
                to: moveToPath,
              });
              await fs.mkdirp(path.dirname(moveToPath));
              await fs.writeFile(moveToPath, after);
              await fs.rmFile(fullPath);
              changed = true;
              continue;
            }

            if (!contentChanged) {
              warnings.push(`Update File made no changes for "${op.filePath}".`);
              continue;
            }

            await fs.mkdirp(path.dirname(fullPath));
            await fs.writeFile(fullPath, after);
            changed = true;
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            throw new Error(`Update File failed for "${op.filePath}": ${message}`);
          }
        }
      }

      return { success: true, changed, warnings: warnings.length > 0 ? warnings : undefined };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log("Tool apply_patch failed", err, { message });

      try {
        if (debugFiles.length < 3) {
          const paths = parsedOps
            ? parsedOps.flatMap((op) =>
                op.kind === "update" && op.moveTo
                  ? [op.filePath, op.moveTo]
                  : [op.filePath],
              )
            : extractPatchPaths(patchString);

          for (const p of paths) {
            if (debugFiles.length >= 3) break;
            await addDebugSnapshot(p);
          }

          if (debugFiles.length < 3 && parsedOps) {
            for (const op of parsedOps) {
              if (debugFiles.length >= 3) break;
              if (op.kind === "add") debugFiles.push({ path: op.filePath, head: "(new file)" });
              if (op.kind === "delete") debugFiles.push({ path: op.filePath, head: "(deleted)" });
            }
          }
        }
      } catch {
        // best-effort only
      }

      return {
        success: false,
        error: message,
        debug: debugFiles.length > 0 ? { files: debugFiles.slice(0, 3) } : undefined,
      };
    }
  };
};
