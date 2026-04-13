import path from "node:path";
const normalizeForPrefixCheck = (value) => value.replace(/\\/g, "/").replace(/\/+$/g, "");
const stripKnownWorkspacePrefix = (inputPath, workspaceRoot) => {
    const inputNormalized = normalizeForPrefixCheck(inputPath);
    const workspaceNormalized = normalizeForPrefixCheck(workspaceRoot);
    if (inputNormalized === workspaceNormalized ||
        inputNormalized.startsWith(`${workspaceNormalized}/`)) {
        return inputNormalized.slice(workspaceNormalized.length);
    }
    const hardcodedWorkspace = "/tmp/workspace";
    if (inputNormalized === hardcodedWorkspace ||
        inputNormalized.startsWith(`${hardcodedWorkspace}/`)) {
        return inputNormalized.slice(hardcodedWorkspace.length);
    }
    const hardcodedWorkspaceNoSlash = "tmp/workspace";
    if (inputNormalized === hardcodedWorkspaceNoSlash ||
        inputNormalized.startsWith(`${hardcodedWorkspaceNoSlash}/`)) {
        return inputNormalized.slice(hardcodedWorkspaceNoSlash.length);
    }
    return null;
};
export const toWorkspacePath = (workspaceRoot, inputPath) => {
    const stripped = stripKnownWorkspacePrefix(inputPath, workspaceRoot);
    const isAbsoluteInput = path.isAbsolute(inputPath);
    if (stripped === null && isAbsoluteInput) {
        throw new Error(`Path "${inputPath}" is absolute but not within workspace "${workspaceRoot}".`);
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
//# sourceMappingURL=fileSystem.helpers.js.map