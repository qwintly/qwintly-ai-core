import { type SearchDeps } from "./search.impl.js";
export type { CoreDirent, CoreFs, CoreLogger, WorkspaceDeps } from "./workspaceDeps.js";
export { DEFAULT_NOT_FOUND_RESPONSE } from "./workspaceDeps.js";
export { createApplyPatchImpl } from "./applyPatch.impl.js";
export { createListDirImpl } from "./listDir.impl.js";
export { createReadFileImpl } from "./readFile.impl.js";
export { createSearchImpl, type SearchDeps, type SearchResult } from "./search.impl.js";
export { createWriteFileImpl } from "./writeFile.impl.js";
export declare const createWorkspaceToolImpls: (deps: SearchDeps) => {
    readFileImpl: (filePath: string, startLine?: number, endLine?: number) => Promise<string>;
    writeFileImpl: (filePath: string, content: string) => Promise<{
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
    listDirImpl: (dirPath: string, depth: number) => Promise<string>;
    searchImpl: (searchQuery: string) => Promise<import("./search.impl.js").SearchResult[]>;
    applyPatchImpl: (patchString: string) => Promise<{
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
};
