export type ToolEvent = {
    name: string;
    summary: string;
};
export type ToolLoopContextPolicy = {
    readFileDefaultMaxLines?: number;
    tailMessages?: number;
    maxModelChars?: number;
    logApproxModelChars?: boolean;
};
export declare const DEFAULT_CONTEXT_POLICY: Required<ToolLoopContextPolicy>;
export declare const redactFunctionCallArgs: (name: string, args: Record<string, unknown>) => Record<string, unknown>;
export declare const compactForModel: (input: {
    initialCount: number;
    modelContents: any[];
    toolEvents: ToolEvent[];
    policy: Required<ToolLoopContextPolicy>;
}) => any[];
export declare const normalizeReadFileArgs: (args: Record<string, unknown>, maxLines: number) => {
    effectiveArgs: {
        start_line: number;
        end_line: number;
    };
    start: number;
    end: number;
    wasCapped: boolean;
};
export declare const getApplyPatchEventMeta: (args: Record<string, unknown>) => {
    chars: number;
    sha256: string;
    files: string[];
};
