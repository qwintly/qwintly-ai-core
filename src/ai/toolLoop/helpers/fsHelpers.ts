import crypto from "node:crypto";
import fs from "node:fs/promises";
import { CoreFs } from "../../tools/implementations/workspaceDeps.js";

export const sha256Hex = (value: string) =>
  crypto.createHash("sha256").update(value, "utf8").digest("hex");

export const extractPatchFiles = (patchString: string): string[] => {
  const lines = patchString.replace(/\r\n/g, "\n").split("\n");
  const files = new Set<string>();

  for (const line of lines) {
    const match =
      /^\*\*\* (Update File|Add File|Delete File):\s+(\S.*)$/.exec(line) ??
      /^\*\*\* Move to:\s+(\S.*)$/.exec(line);

    if (!match) continue;

    const filePath = (match[2] ?? match[1] ?? "").trim();
    if (filePath) files.add(filePath);
  }

  return [...files];
};

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
