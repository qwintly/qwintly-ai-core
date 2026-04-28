import { FunctionCallingConfigMode, Tool } from "@google/genai";
import { ToolEvent } from "./toolLoopContext.js";
type LoggerLike = {
    status?: (message: string, meta?: Record<string, unknown>) => void;
    info?: (message: string, meta?: Record<string, unknown>) => void;
    warn?: (message: string, meta?: Record<string, unknown>) => void;
};
type AiCallLike = (request: unknown, options: {
    tools?: Tool[];
    model?: string;
    toolCallingMode?: FunctionCallingConfigMode;
}) => Promise<{
    functionCalls?: any[];
    text?: string;
}>;
export declare const sleep: (ms: number) => Promise<void>;
export declare const serializeError: (err: unknown) => {
    name: string;
    message: string;
    stack: string | undefined;
    cause: unknown;
    value?: undefined;
} | {
    name: "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function";
    message: string;
    value: unknown;
    stack?: undefined;
    cause?: undefined;
};
export declare const isTransientAiCallError: (err: unknown) => boolean;
export declare const computeBackoffMs: (attempt: number, baseMs: number, maxMs: number) => number;
export declare const aiCallWithRetry: (params: {
    aiCall: AiCallLike;
    request: unknown;
    options: {
        tools?: Tool[];
        model?: string;
        toolCallingMode?: FunctionCallingConfigMode;
    };
    retryMax: number;
    retryBaseMs: number;
    retryMaxMs: number;
    step: number;
    logger?: LoggerLike;
}) => Promise<{
    functionCalls?: any[];
    text?: string;
}>;
export declare const buildToolStatusMessage: (name: string, effectiveArgs: Record<string, unknown>, readFileMeta: {
    start: number;
    end: number;
    wasCapped: boolean;
} | null) => string;
export declare const recordToolEvent: (params: {
    toolEvents: ToolEvent[];
    name: string;
    effectiveArgs: Record<string, unknown>;
    modelArgs: Record<string, unknown>;
    readFileMeta: {
        start: number;
        end: number;
        wasCapped: boolean;
    } | null;
    toolResult: unknown;
    toolResultRaw: unknown;
}) => void;
export {};
