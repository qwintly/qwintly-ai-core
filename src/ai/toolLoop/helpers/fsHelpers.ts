import fs from "node:fs/promises";
import { CoreFs } from "../../tools/implementations/workspaceDeps.js";


export const nodeFs: CoreFs = {
  readFile: async (absolutePath) => fs.readFile(absolutePath, "utf-8"),
  writeFile: async (absolutePath, content) =>
    fs.writeFile(absolutePath, content ?? "", "utf-8"),
  mkdirp: async (absoluteDir) => {
    await fs.mkdir(absoluteDir, { recursive: true });
  },
  rmFile: async (absolutePath) => fs.rm(absolutePath, { force: true }),
  stat: async (absolutePath) => fs.stat(absolutePath),
  safeReadDir: async (absoluteDir) =>
    fs.readdir(absoluteDir, { withFileTypes: true }),
};
