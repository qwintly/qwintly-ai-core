export interface ProjectConfigsConfig {
  frameworkConfig: ProjectConfigsFrameworkConfig;
  runtimeConfig: ProjectConfigsRuntimeConfig;
  toolingConfig: ProjectConfigsToolingConfig;
  renderingConfig: any;
}

export interface ProjectConfigsFrameworkConfig {
  name: string;
  router: string;
  language: string;
  icons: string;
  styling: string;
}

export interface ProjectConfigsRuntimeConfig {
  target: string;
  serverActions: string;
  apiRoutes: string;
  dataFetching: string;
}

export interface ProjectConfigsToolingConfig {
  packageManager: string;
  linting: string;
  formatting: string;
  typecheck: string;
  testing: string;
}
