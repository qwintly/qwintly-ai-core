import path from "node:path";
import { toWorkspacePath } from "../helpers/fileSystem.helpers.js";
import { DEFAULT_NOT_FOUND_RESPONSE } from "./workspaceDeps.js";
export const createListDirImpl = (deps) => {
    const { workspaceRoot, fs, logger } = deps;
    const MAX_LINES = 500;
    return async (dirPath, depth) => {
        const fullPath = toWorkspacePath(workspaceRoot, dirPath);
        logger?.info?.(`Tool list_dir: ${fullPath} (depth=${depth})`);
        const effectiveDepth = Math.max(1, Math.min(3, depth ?? 1));
        try {
            const st = await fs.stat(fullPath);
            if (!st.isDirectory())
                return `not a directory: ${dirPath}`;
        }
        catch (err) {
            const code = err?.code;
            if (code === "ENOENT")
                return DEFAULT_NOT_FOUND_RESPONSE;
            throw err;
        }
        const lines = [];
        const walk = async (dir, currentDepth, prefix) => {
            if (lines.length >= MAX_LINES)
                return;
            const entries = await fs.safeReadDir(dir);
            for (const entry of entries) {
                if (lines.length >= MAX_LINES)
                    return;
                if (!entry.isDirectory() && !entry.isFile())
                    continue;
                const isDir = entry.isDirectory();
                const displayName = isDir ? `/${entry.name}` : entry.name;
                const line = prefix ? `${prefix}${displayName}` : displayName;
                lines.push(line);
                if (isDir && currentDepth < effectiveDepth) {
                    await walk(path.join(dir, entry.name), currentDepth + 1, `${prefix}  `);
                }
            }
        };
        await walk(fullPath, 1, "");
        if (lines.length >= MAX_LINES)
            lines.push("... truncated ...");
        return lines.join("\n");
    };
};
//# sourceMappingURL=listDir.impl.js.map