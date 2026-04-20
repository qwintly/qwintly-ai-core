import { type WorkspaceDeps } from "./workspaceDeps.js";
export declare const createApplyPatchImpl: (deps: WorkspaceDeps) => (patchString: string) => Promise<{
    success: boolean;
    changed: boolean;
    warnings: string[] | undefined;
    error?: undefined;
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
    changed?: undefined;
    warnings?: undefined;
}>;
