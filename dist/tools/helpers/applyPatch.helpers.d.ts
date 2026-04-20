export type ApplyPatchOperation = {
    kind: "update";
    filePath: string;
    moveTo?: string;
    hunks: PatchHunk[];
} | {
    kind: "add";
    filePath: string;
    hunks: PatchHunk[];
} | {
    kind: "delete";
    filePath: string;
};
type PatchLine = {
    kind: "context";
    text: string;
} | {
    kind: "add";
    text: string;
} | {
    kind: "delete";
    text: string;
};
export type PatchHunk = {
    label?: string;
    anchorEOF?: boolean;
    lines: PatchLine[];
};
export declare function parseApplyPatch(patchString: string): ApplyPatchOperation[];
export declare function applyHunksToContent(content: string, hunks: PatchHunk[]): {
    content: string;
    changed: boolean;
};
export declare function isTextFilePath(filePath: string): boolean;
export {};
