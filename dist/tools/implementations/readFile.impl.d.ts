import { type WorkspaceDeps } from "./workspaceDeps.js";
export declare const createReadFileImpl: (deps: WorkspaceDeps) => (filePath: string, startLine?: number, endLine?: number) => Promise<string>;
