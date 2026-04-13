import { toWorkspacePath } from "../helpers/fileSystem.helpers.js";
import { sliceByLines } from "../helpers/format.helpers.js";
import { DEFAULT_NOT_FOUND_RESPONSE } from "./workspaceDeps.js";
export const createReadFileImpl = (deps) => {
    const { workspaceRoot, fs, logger } = deps;
    return async (filePath, startLine, endLine) => {
        const fullPath = toWorkspacePath(workspaceRoot, filePath);
        logger?.info?.(`Tool read_file: ${fullPath}`);
        try {
            await fs.stat(fullPath);
        }
        catch (err) {
            const code = err?.code;
            if (code === "ENOENT")
                return DEFAULT_NOT_FOUND_RESPONSE;
            throw err;
        }
        const content = await fs.readFile(fullPath);
        return sliceByLines(content, startLine, endLine);
    };
};
//# sourceMappingURL=readFile.impl.js.map