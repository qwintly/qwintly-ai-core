import { projectConfigs } from "../../indexer/data/configs.constants.js";

export type CodegenIndex = {
  folderTree: string;
  projectConfigs: Pick<
    typeof projectConfigs,
    "frameworkConfig" | "runtimeConfig" | "renderingConfig"
  >;
};

export type PlannerIndex = {
  folderTree: string;
  projectConfigs: Pick<
    typeof projectConfigs,
    "frameworkConfig" | "runtimeConfig" | "toolingConfig" | "renderingConfig"
  >;
};

export type ValidatorIndex = {
  folderTree: string;
  projectConfigs: Pick<
    typeof projectConfigs,
    "frameworkConfig" | "runtimeConfig" | "toolingConfig" | "renderingConfig"
  >;
};
