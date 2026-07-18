import {
  ReadFileStatusBuilder,
  SearchStatusBuilder,
  ListDirStatusBuilder,
  UpdateGlobalStylesStatusBuilder,
  CreateNewRouteStatusBuilder,
  ModifyElementStatusBuilder,
  GetAvailableRoutesStatusBuilder,
  SubmitPlannerTasksStatusBuilder,
  SubmitCodegenDoneStatusBuilder,
  BaseStatusBuilder,
} from "./ToolStatusBuilders.js";

export class ToolStatusManager {
  private readonly builders: Record<string, BaseStatusBuilder>;

  constructor() {
    this.builders = {
      read_file: new ReadFileStatusBuilder(),
      search: new SearchStatusBuilder(),
      list_dir: new ListDirStatusBuilder(),
      update_global_styles: new UpdateGlobalStylesStatusBuilder(),
      create_new_route: new CreateNewRouteStatusBuilder(),
      modify_element: new ModifyElementStatusBuilder(),
      get_available_routes: new GetAvailableRoutesStatusBuilder(),
      submit_planner_tasks: new SubmitPlannerTasksStatusBuilder(),
      submit_codegen_done: new SubmitCodegenDoneStatusBuilder(),
    };
  }

  public getMessage(
    name: string,
    effectiveArgs: Record<string, unknown>,
    readFileMeta: { start: number; end: number; wasCapped: boolean } | null,
  ): string {
    const builder = this.builders[name];
    if (builder) {
      const msg = builder.build({ name, effectiveArgs, readFileMeta });
      if (msg) return msg;
    }
    return `AI tool: ${name}`;
  }
}
