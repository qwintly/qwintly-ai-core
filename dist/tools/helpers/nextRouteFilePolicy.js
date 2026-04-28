export const ALLOWED_ROUTE_FILENAMES = new Set(["page.tsx", "page.config.ts"]);
export const PAGE_TSX_TEMPLATE = [
    'import { config } from "./page.config";',
    'import { RenderElement } from "@/lib/renderer/RenderElement";',
    "",
    "export default function Page() {",
    "  return config.elements.map((el) => <RenderElement key={el.id} el={el} />);",
    "}",
    "",
].join("\n");
export const normalizeFsPathForPolicy = (p) => String(p ?? "").replace(/\\/g, "/").trim();
export const isAllowedRouteFilePath = (p) => {
    const norm = normalizeFsPathForPolicy(p);
    const filename = norm.split("/").pop() ?? "";
    return ALLOWED_ROUTE_FILENAMES.has(filename);
};
export const isPageTsxPath = (p) => {
    const norm = normalizeFsPathForPolicy(p);
    return (norm.split("/").pop() ?? "") === "page.tsx";
};
export const isPageConfigPath = (p) => {
    const norm = normalizeFsPathForPolicy(p);
    return (norm.split("/").pop() ?? "") === "page.config.ts";
};
export const matchesPageTsxTemplate = (content) => String(content ?? "").replace(/\r\n/g, "\n") === PAGE_TSX_TEMPLATE;
//# sourceMappingURL=nextRouteFilePolicy.js.map