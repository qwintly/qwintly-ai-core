import path from "node:path";

const normalizeForPrefixCheck = (value: string) =>
  value.replace(/\\/g, "/").replace(/\/+$/g, "");

const stripKnownWorkspacePrefix = (inputPath: string, workspaceRoot: string) => {
  const inputNormalized = normalizeForPrefixCheck(inputPath);
  const workspaceNormalized = normalizeForPrefixCheck(workspaceRoot);
  const caseInsensitive = process.platform === "win32";
  const inputCmp = caseInsensitive ? inputNormalized.toLowerCase() : inputNormalized;
  const workspaceCmp = caseInsensitive
    ? workspaceNormalized.toLowerCase()
    : workspaceNormalized;

  if (
    inputCmp === workspaceCmp ||
    inputCmp.startsWith(`${workspaceCmp}/`)
  ) {
    return inputNormalized.slice(workspaceNormalized.length);
  }

  const hardcodedWorkspace = "/tmp/workspace";
  if (
    inputCmp === (caseInsensitive ? hardcodedWorkspace.toLowerCase() : hardcodedWorkspace) ||
    inputCmp.startsWith(`${caseInsensitive ? hardcodedWorkspace.toLowerCase() : hardcodedWorkspace}/`)
  ) {
    return inputNormalized.slice(hardcodedWorkspace.length);
  }

  const hardcodedWorkspaceNoSlash = "tmp/workspace";
  if (
    inputCmp ===
      (caseInsensitive
        ? hardcodedWorkspaceNoSlash.toLowerCase()
        : hardcodedWorkspaceNoSlash) ||
    inputCmp.startsWith(
      `${caseInsensitive ? hardcodedWorkspaceNoSlash.toLowerCase() : hardcodedWorkspaceNoSlash}/`,
    )
  ) {
    return inputNormalized.slice(hardcodedWorkspaceNoSlash.length);
  }

  return null;
};

export const toWorkspacePath = (workspaceRoot: string, inputPath: string) => {
  const stripped = stripKnownWorkspacePrefix(inputPath, workspaceRoot);
  const isAbsoluteInput = path.isAbsolute(inputPath);

  if (stripped === null && isAbsoluteInput) {
    throw new Error(
      `Path "${inputPath}" is absolute but not within workspace "${workspaceRoot}".`,
    );
  }

  const relativePath = (stripped ?? inputPath).replace(/^[\/\\]+/, "");
  const resolvedRoot = path.resolve(workspaceRoot);
  const resolved = path.resolve(resolvedRoot, relativePath);
  const rel = path.relative(resolvedRoot, resolved);

  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Path "${inputPath}" resolves outside the workspace root.`);
  }

  return resolved;
};
