import { type WorkspaceDeps } from "./workspaceDeps.js";
export declare const createWriteFileImpl: (deps: WorkspaceDeps) => (filePath: string, content: string) => Promise<{
    ok: boolean;
}>;
