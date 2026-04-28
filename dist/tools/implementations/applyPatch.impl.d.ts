import { type WorkspaceDeps } from "./workspaceDeps.js";
export declare const createApplyPatchImpl: (deps: WorkspaceDeps) => (patchString: string) => Promise<{
    success: boolean;
    rejected: boolean;
    error: string;
    allowed: string[];
    rule?: undefined;
    changed?: undefined;
    warnings?: undefined;
    debug?: undefined;
} | {
    success: boolean;
    rejected: boolean;
    error: string;
    allowed?: undefined;
    rule?: undefined;
    changed?: undefined;
    warnings?: undefined;
    debug?: undefined;
} | {
    success: boolean;
    rejected: boolean;
    error: string;
    rule: string;
    allowed?: undefined;
    changed?: undefined;
    warnings?: undefined;
    debug?: undefined;
} | {
    success: boolean;
    changed: boolean;
    warnings: string[] | undefined;
    rejected?: undefined;
    error?: undefined;
    allowed?: undefined;
    rule?: undefined;
    debug?: undefined;
} | {
    success: boolean;
    error: string;
    debug: {
        files: {
            path: string;
            head: string;
        }[];
    } | undefined;
    rejected?: undefined;
    allowed?: undefined;
    rule?: undefined;
    changed?: undefined;
    warnings?: undefined;
}>;
