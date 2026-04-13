import { type WorkspaceDeps } from "./workspaceDeps.js";
export type SearchResult = {
    path: string;
    content: string;
};
export type SearchDeps = WorkspaceDeps & {
    execRg?: (input: {
        query: string;
        cwd: string;
        maxCount: number;
    }) => Promise<{
        code: number;
        stdout: string;
        stderr: string;
    }>;
};
export declare const createSearchImpl: (deps: SearchDeps) => (searchQuery: string) => Promise<SearchResult[]>;
