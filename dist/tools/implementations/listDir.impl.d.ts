import { type WorkspaceDeps } from "./workspaceDeps.js";
export declare const createListDirImpl: (deps: WorkspaceDeps) => (dirPath: string, depth: number) => Promise<string>;
