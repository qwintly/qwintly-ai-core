import path from "node:path";
import { toWorkspacePath } from "../helpers/fileSystem.helpers.js";
export const createWriteFileImpl = (deps) => {
    const { workspaceRoot, fs, logger } = deps;
    return async (filePath, content) => {
        const fullPath = toWorkspacePath(workspaceRoot, filePath);
        logger?.info?.(`Tool write_file: ${fullPath}`);
        await fs.mkdirp(path.dirname(fullPath));
        await fs.writeFile(fullPath, content ?? "");
        return { ok: true };
    };
};
//# sourceMappingURL=writeFile.impl.js.map