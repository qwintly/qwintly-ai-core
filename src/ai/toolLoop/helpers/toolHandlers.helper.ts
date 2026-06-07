import { getAvailableRoutes } from "../../tools/helpers/pageConfigJson.helpers.js";
import { createWorkspaceToolImpls } from "../../tools/implementations/factories.js";
import { nodeFs } from "./fsHelpers.js";
import { parsePlannerTasksUnknown } from "./plannerTaskParser.js";

export function createToolHandlers(params: {
  impls: ReturnType<typeof createWorkspaceToolImpls>;
  workspaceRoot: string;
}): Record<string, (args: any) => Promise<any>> {
  return {
    read_file: async (args) => {
      const path = String(args.path ?? "");
      const startLine =
        args.start_line === undefined ? undefined : Number(args.start_line);
      const endLine =
        args.end_line === undefined ? undefined : Number(args.end_line);
      const content = await params.impls.readFileImpl(path, startLine, endLine);
      return { path, content };
    },
    write_file: (args) =>
      params.impls.writeFileImpl(String(args.path ?? ""), String(args.content ?? "")),
    list_dir: async (args) => {
      const content = await params.impls.listDirImpl(
        String(args.path ?? ""),
        Number(args.depth ?? 1),
      );
      return { content };
    },
    search: async (args) => {
      const results = await params.impls.searchImpl(String(args.search_query ?? ""));
      return { results };
    },
    apply_patch: (args) =>
      params.impls.applyPatchImpl(String(args.patch_string ?? "")),
    update_global_styles: async (args) => {
      const result = await params.impls.updateGlobalStylesImpl(args);
      return result;
    },
    create_new_route: async (args) => {
      const parentRoute = String(args.parent_route ?? "");
      const routeName = String(args.route_name ?? "");
      const result = await params.impls.createNewRouteImpl(parentRoute, routeName);
      return result;
    },
    delete_element: async (args) => {
      const route = String(args.route ?? "");
      const element_id = String(args.element_id ?? "");
      const result = await params.impls.deleteElementImpl(route, element_id);
      return result;
    },
    insert_element: async (args) => {
      const result = await params.impls.insertElementImpl(args);
      if (!result.success) {
        const available = await getAvailableRoutes({
          workspaceRoot: params.workspaceRoot,
          fs: nodeFs,
        });
        return {
          success: false,
          error: `insert_element failed: ${result.error}. Available routes are: ${JSON.stringify(available)}. If you intend to create a new route, create it using the 'create_new_route' tool.`,
          available_routes: available,
        };
      }
      return result;
    },
    update_props: async (args) => {
      const route = String(args.route ?? "");
      const element_id = String(args.element_id ?? "");
      const props: any = args.props;
      const result = await params.impls.updatePropsImpl({
        route,
        element_id,
        ...props,
      });
      return result;
    },
    update_classname: async (args) => {
      const route = String(args.route ?? "");
      const element_id = String(args.element_id ?? "");
      const class_name = String(args.class_name ?? "");
      const result = await params.impls.updateClassNameImpl(
        route,
        element_id,
        class_name,
      );
      return result;
    },
    get_available_routes: async (args) => {
      const routes = await getAvailableRoutes({ workspaceRoot: params.workspaceRoot, fs: nodeFs });
      return { success: true, routes };
    },
    submit_codegen_done: async (args) => ({
      success: true,
      summary: String(args.summary ?? "").trim(),
    }),
    submit_planner_tasks: async (args) => {
      const tasks = parsePlannerTasksUnknown(args.planner_tasks);
      return { success: true, count: tasks.length };
    },
  };
}
