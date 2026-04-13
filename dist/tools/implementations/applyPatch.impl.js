import path from "node:path";
import { applyHunksToContent, isTextFilePath, parseApplyPatch } from "../helpers/applyPatch.helpers.js";
import { toWorkspacePath } from "../helpers/fileSystem.helpers.js";
export const createApplyPatchImpl = (deps) => {
    const { workspaceRoot, fs, logger } = deps;
    return async (patchString) => {
        try {
            const operations = parseApplyPatch(patchString);
            for (const op of operations) {
                if (op.kind !== "update")
                    continue;
                const hasAnyChanges = op.hunks.some((hunk) => hunk.lines.some((line) => line.kind === "add" || line.kind === "delete"));
                if (!hasAnyChanges) {
                    throw new Error(`Invalid patch for "${op.filePath}": Update File contains no "+" or "-" lines, so nothing can be applied. ` +
                        `If you intend to replace the entire file, use "*** Delete File:" followed by "*** Add File:" with the full contents. ` +
                        `If you intend to edit in-place, prefix added lines with "+" and removed lines with "-".`);
                }
            }
            for (const op of operations) {
                if (!isTextFilePath(op.filePath)) {
                    throw new Error(`Binary or unsupported file type in patch: "${op.filePath}"`);
                }
                const fullPath = toWorkspacePath(workspaceRoot, op.filePath);
                if (op.kind === "delete") {
                    logger?.info?.(`Tool apply_patch (delete): ${fullPath}`);
                    try {
                        await fs.rmFile(fullPath);
                    }
                    catch (err) {
                        const message = err instanceof Error ? err.message : String(err);
                        throw new Error(`Delete File failed for "${op.filePath}": ${message}`);
                    }
                    continue;
                }
                if (op.kind === "add") {
                    logger?.info?.(`Tool apply_patch (add): ${fullPath}`);
                    try {
                        const { content: after } = applyHunksToContent("", op.hunks);
                        await fs.mkdirp(path.dirname(fullPath));
                        await fs.writeFile(fullPath, after);
                    }
                    catch (err) {
                        const message = err instanceof Error ? err.message : String(err);
                        throw new Error(`Add File failed for "${op.filePath}": ${message}`);
                    }
                    continue;
                }
                if (op.kind === "update") {
                    logger?.info?.(`Tool apply_patch (update): ${fullPath}`);
                    try {
                        try {
                            await fs.stat(fullPath);
                        }
                        catch (err) {
                            const code = err?.code;
                            if (code === "ENOENT") {
                                throw new Error(`"${op.filePath}" not found.`);
                            }
                            throw err;
                        }
                        const before = await fs.readFile(fullPath);
                        const { content: after } = applyHunksToContent(before, op.hunks);
                        await fs.mkdirp(path.dirname(fullPath));
                        await fs.writeFile(fullPath, after);
                    }
                    catch (err) {
                        const message = err instanceof Error ? err.message : String(err);
                        throw new Error(`Update File failed for "${op.filePath}": ${message}`);
                    }
                }
            }
            return { success: true };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger?.error?.(`Tool apply_patch failed: ${message}`);
            return { success: false, error: message };
        }
    };
};
//# sourceMappingURL=applyPatch.impl.js.map