export declare const ALLOWED_ROUTE_FILENAMES: Set<string>;
export declare const PAGE_TSX_TEMPLATE: string;
export declare const normalizeFsPathForPolicy: (p: string) => string;
export declare const isAllowedRouteFilePath: (p: string) => boolean;
export declare const isPageTsxPath: (p: string) => boolean;
export declare const isPageConfigPath: (p: string) => boolean;
export declare const matchesPageTsxTemplate: (content: string) => boolean;
