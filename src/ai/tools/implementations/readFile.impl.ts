import { toWorkspacePath } from "../helpers/fileSystem.helpers.js";
import { sliceByLines } from "../helpers/format.helpers.js";
import { DEFAULT_NOT_FOUND_RESPONSE, type WorkspaceDeps } from "./workspaceDeps.js";

export const createReadFileImpl = (deps: WorkspaceDeps) => {
  const { workspaceRoot, fs } = deps;

  return async (filePath: string, startLine?: number, endLine?: number) => {
    const fullPath = toWorkspacePath(workspaceRoot, filePath);
    console.log("Tool read_file", { path: fullPath });

    try {
      await fs.stat(fullPath);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException | null)?.code;
      if (code === "ENOENT") return DEFAULT_NOT_FOUND_RESPONSE;
      console.log("Tool read_file failed", err, { path: fullPath });
      throw err;
    }

    const content = await fs.readFile(fullPath);
    return sliceByLines(content, startLine, endLine);
  };
};
