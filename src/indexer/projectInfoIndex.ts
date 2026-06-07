import {
  getAvailableRoutes,
  getPageConfigJsonPath,
} from "../ai/tools/helpers/pageConfigJson.helpers.js";
import { ProjectInfo } from "../types/projectInfo.types.js";
import { readFile, safeReadDir } from "../utils/workspace.js";

type UiPage = ProjectInfo["uiPages"][number];

const sectionNameFromId = (id: string): string => {
  if (!id) return "";
  if (id.endsWith("-section")) return id.slice(0, -"-section".length);
  if (id.endsWith("-container")) return id.slice(0, -"-container".length);
  return id;
};

const computePageNameFromRoute = (pageRoute: string): string => {
  if (pageRoute === "/") return "root";
  return pageRoute.slice(1).split("/").join("-");
};

const findRootElement = (els: any[]): any => {
  let rootElement: any = null;
  const findRoot = (items: any[]) => {
    for (const el of items) {
      if (el && typeof el === "object") {
        if (el.type === "div" && el.id === "root") {
          rootElement = el;
          return;
        }
        if (Array.isArray(el.children)) {
          findRoot(el.children);
          if (rootElement) return;
        }
      }
    }
  };
  findRoot(els);
  return rootElement;
};

const extractRootSections = (rootElement: any): string[] => {
  if (!rootElement || !Array.isArray(rootElement.children)) return [];
  const rootSections: string[] = [];
  for (const child of rootElement.children) {
    if (
      child &&
      typeof child === "object" &&
      child.type === "div" &&
      child.id &&
      child.id !== "root"
    ) {
      const name = sectionNameFromId(child.id);
      if (name) {
        rootSections.push(name);
      }
    }
  }
  return rootSections;
};

const collectFallbackSections = (elements: any[]): string[] => {
  const seen = new Set<string>();
  const results: string[] = [];
  const collectFallback = (els: any[]) => {
    for (const el of els) {
      if (el && typeof el === "object") {
        if (
          el.type === "div" &&
          el.id &&
          el.id !== "root" &&
          (el.id.endsWith("-section") || el.id.endsWith("-container"))
        ) {
          const sectionName = sectionNameFromId(el.id);
          if (sectionName && !seen.has(sectionName)) {
            seen.add(sectionName);
            results.push(sectionName);
          }
        }
        if (Array.isArray(el.children)) {
          collectFallback(el.children);
        }
      }
    }
  };
  collectFallback(elements);
  return results;
};

const extractSectionNamesFromParsedConfig = (config: any): string[] => {
  if (!config || !Array.isArray(config.elements)) return [];

  const rootElement = findRootElement(config.elements);
  const rootSections = extractRootSections(rootElement);
  if (rootSections.length > 0) {
    return rootSections;
  }

  return collectFallbackSections(config.elements);
};

export async function computeProjectInfo(
  rootDir: string,
): Promise<ProjectInfo> {
  const routes = await getAvailableRoutes({
    workspaceRoot: rootDir,
    fs: { safeReadDir },
  });

  const uiPages: UiPage[] = [];

  for (const pageRoute of routes) {
    const pageName = computePageNameFromRoute(pageRoute);
    const description = `${pageName} page for this project`;

    let sectionNames: string[] = [];
    try {
      const configPath = getPageConfigJsonPath(rootDir, pageRoute);
      const content = await readFile(configPath);
      if (content) {
        const config = JSON.parse(content);
        sectionNames = extractSectionNamesFromParsedConfig(config);
      }
    } catch {
      // Ignore reading/parsing errors, treat as no sections
    }

    const page: UiPage = {
      pageRoute,
      pageName,
      description,
    };

    if (sectionNames.length > 0) {
      page.sections = sectionNames.map((sectionName) => ({
        sectionName,
        description: `${sectionName} section for this page`,
      }));
    }

    uiPages.push(page);
  }

  uiPages.sort((a, b) =>
    a.pageRoute.localeCompare(b.pageRoute, undefined, {
      sensitivity: "base",
    }),
  );

  return {
    uiPages,
    lastUpdatedPlanVersion: 1,
  };
}