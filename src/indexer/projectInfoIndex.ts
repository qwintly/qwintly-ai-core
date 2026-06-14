import {
  getAvailableRoutes,
} from "../ai/tools/helpers/pageConfigJson.helpers.js";
import { ProjectInfo } from "../types/projectInfo.types.js";
import { safeReadDir } from "../utils/workspace.js";

type UiPage = ProjectInfo["uiPages"][number];

const computePageNameFromRoute = (pageRoute: string): string => {
  if (pageRoute === "/") return "root";
  return pageRoute.slice(1).split("/").join("-");
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

    const page: UiPage = {
      pageRoute,
      pageName,
      description,
    };

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