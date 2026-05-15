import { CodegenIndex } from "../types/index/index.types.js";
import { projectConfigs } from "./data/configs.constants.js";
import { buildFolderTree } from "./helpers/buildFolderTree.js";

export const buildCodegenIndex = async (
  rootDir: string,
): Promise<CodegenIndex> => {
  const folderTree = await buildFolderTree(rootDir);

  return {
    folderTree,
    projectConfigs: {
      frameworkConfig: projectConfigs.frameworkConfig,
      runtimeConfig: projectConfigs.runtimeConfig,
      renderingConfig: projectConfigs.renderingConfig,
    },
  };
};
