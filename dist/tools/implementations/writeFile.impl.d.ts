import { type WorkspaceDeps } from "./workspaceDeps.js";
export declare const createWriteFileImpl: (deps: WorkspaceDeps) => (filePath: string, content: string) => Promise<{
    success: boolean;
    rejected: boolean;
    error: string;
    allowed: string[];
    rule?: undefined;
} | {
    success: boolean;
    rejected: boolean;
    error: string;
    allowed?: undefined;
    rule?: undefined;
} | {
    success: boolean;
    rejected: boolean;
    error: string;
    rule: string;
    allowed?: undefined;
} | {
    success: boolean;
    rejected?: undefined;
    error?: undefined;
    allowed?: undefined;
    rule?: undefined;
}>;
