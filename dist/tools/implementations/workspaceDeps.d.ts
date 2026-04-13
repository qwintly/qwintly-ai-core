export type CoreLogger = {
    info?: (message: string) => void;
    warn?: (message: string) => void;
    error?: (message: string) => void;
};
export type CoreDirent = {
    name: string;
    isDirectory: () => boolean;
    isFile: () => boolean;
};
export type CoreFs = {
    readFile: (absolutePath: string) => Promise<string>;
    writeFile: (absolutePath: string, content: string) => Promise<void>;
    mkdirp: (absoluteDir: string) => Promise<void>;
    rmFile: (absolutePath: string) => Promise<void>;
    stat: (absolutePath: string) => Promise<{
        isDirectory: () => boolean;
    }>;
    safeReadDir: (absoluteDir: string) => Promise<CoreDirent[]>;
};
export type WorkspaceDeps = {
    workspaceRoot: string;
    fs: CoreFs;
    logger?: CoreLogger;
};
export declare const DEFAULT_NOT_FOUND_RESPONSE = "not found";
