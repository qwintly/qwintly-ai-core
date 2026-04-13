import { FunctionCallingConfigMode, Tool } from "@google/genai";
import { ToolLoopContextPolicy } from "./toolLoopContext.js";
export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;
export type ToolLoopResult = {
    contents: any[];
    modelContents: any[];
    finalText: string;
    steps: number;
    terminalCall?: {
        name: string;
        args: Record<string, unknown>;
        response: unknown;
    };
};
export type ToolLoopLogger = {
    info?: (message: string) => void;
    warn?: (message: string) => void;
    error?: (message: string) => void;
};
type AiCallFn = (request: unknown, options: {
    tools?: Tool[];
    model?: string;
    toolCallingMode?: FunctionCallingConfigMode;
}) => Promise<{
    functionCalls?: any[];
    text?: string;
}>;
export type RunToolLoopOptions = {
    initialContents: any[];
    tools: Tool[];
    handlers: Record<string, ToolHandler>;
    maxSteps?: number;
    model?: string;
    toolCallingMode?: FunctionCallingConfigMode;
    terminalToolNames?: string[];
    keepFullTrace?: boolean;
    contextPolicy?: ToolLoopContextPolicy;
    aiCall: AiCallFn;
    logger?: ToolLoopLogger;
    applyPatchAutoRetryMax?: number;
};
export declare function runToolLoop(options: RunToolLoopOptions): Promise<ToolLoopResult>;
export {};
