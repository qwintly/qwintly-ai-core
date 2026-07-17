import { StatusMessageInput } from "../types/status.types.js";

export abstract class BaseStatusBuilder {
  public abstract build(input: StatusMessageInput): string;

  protected getStringArg(
    args: Record<string, unknown>,
    key: string,
    defaultValue = "",
  ): string {
    const val = args[key];
    return typeof val === "string" ? val : defaultValue;
  }

  protected getNumberArg(
    args: Record<string, unknown>,
    key: string,
    defaultValue?: number,
  ): number | undefined {
    const val = args[key];
    if (val === undefined) return defaultValue;
    const num = Number(val);
    return Number.isNaN(num) ? defaultValue : num;
  }
}

export class ReadFileStatusBuilder extends BaseStatusBuilder {
  public build({ effectiveArgs, readFileMeta }: StatusMessageInput): string {
    const path = this.getStringArg(effectiveArgs, "path");
    if (readFileMeta) {
      return `AI tool: Reading file "${path}" (lines ${readFileMeta.start}-${readFileMeta.end}${
        readFileMeta.wasCapped ? ", capped" : ""
      })`;
    }

    const start = this.getNumberArg(effectiveArgs, "start_line", 1);
    const end = this.getNumberArg(effectiveArgs, "end_line");
    const lines =
      end === undefined ? `starting at line ${start}` : `lines ${start}-${end}`;
    return `AI tool: Reading file "${path}" (${lines})`;
  }
}

export class SearchStatusBuilder extends BaseStatusBuilder {
  public build({ effectiveArgs }: StatusMessageInput): string {
    const query = this.getStringArg(effectiveArgs, "search_query");
    return query
      ? `AI tool: Searching workspace for "${query}"`
      : "AI tool: Searching workspace";
  }
}

export class ListDirStatusBuilder extends BaseStatusBuilder {
  public build({ effectiveArgs }: StatusMessageInput): string {
    const path = this.getStringArg(effectiveArgs, "path");
    const depth = this.getNumberArg(effectiveArgs, "depth", 1);
    return `AI tool: Listing contents of directory "${path}" (depth: ${depth})`;
  }
}

export class UpdateGlobalStylesStatusBuilder extends BaseStatusBuilder {
  public build({ effectiveArgs }: StatusMessageInput): string {
    const keys = Object.keys(effectiveArgs);
    return keys.length > 0
      ? `AI tool: Updating global styles (${keys.join(", ")})`
      : "AI tool: Updating global styles";
  }
}

export class CreateNewRouteStatusBuilder extends BaseStatusBuilder {
  public build({ effectiveArgs }: StatusMessageInput): string {
    const route = this.getStringArg(effectiveArgs, "route_name");
    const parent = this.getStringArg(effectiveArgs, "parent_route", "/");
    return `AI tool: Creating new route "${route}" (parent: "${parent}")`;
  }
}

export class ModifyElementStatusBuilder extends BaseStatusBuilder {
  public build({ effectiveArgs }: StatusMessageInput): string {
    const action = this.getStringArg(effectiveArgs, "action");
    const route = this.getStringArg(effectiveArgs, "route");
    const elementId = this.getStringArg(effectiveArgs, "element_id");

    if (action === "insert") {
      const parent = this.getStringArg(effectiveArgs, "parent_id");
      const before = this.getStringArg(effectiveArgs, "before_id");
      const beforeStr = before ? `, before "${before}"` : "";
      return `AI tool: Inserting element into route "${route}" (under parent "${parent}"${beforeStr})`;
    }

    if (action === "delete") {
      return `AI tool: Deleting element "${elementId}" from route "${route}"`;
    }

    if (action === "update_classname") {
      const className = this.getStringArg(effectiveArgs, "className");
      const classNameStr = className ? ` to "${className}"` : "";
      return `AI tool: Updating class name for element "${elementId}" on route "${route}"${classNameStr}`;
    }

    if (action === "update_props") {
      return `AI tool: Updating properties for element "${elementId}" on route "${route}"`;
    }

    return `AI tool: Modifying element on route "${route}" (action: ${action})`;
  }
}

export class GetAvailableRoutesStatusBuilder extends BaseStatusBuilder {
  public build(): string {
    return "AI tool: Retrieving available routes";
  }
}

export class SubmitPlannerTasksStatusBuilder extends BaseStatusBuilder {
  public build(): string {
    return "AI tool: Submitting planner tasks";
  }
}

export class SubmitCodegenDoneStatusBuilder extends BaseStatusBuilder {
  public build({ effectiveArgs }: StatusMessageInput): string {
    const summary = this.getStringArg(effectiveArgs, "summary");
    return summary
      ? `AI tool: Submitting completed work: "${summary}"`
      : "AI tool: Submitting completed work";
  }
}
