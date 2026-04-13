import { type WorkspaceDeps } from "./workspaceDeps.js";
export declare const createApplyPatchImpl: (deps: WorkspaceDeps) => (patchString: string) => Promise<{
    success: boolean;
    error?: undefined;
} | {
    success: boolean;
    error: string;
}>;
