import { EVENT_TYPES, EventType } from "../../../types/events.js";
import { serializeError } from "./errors.helper.js";

export type Logger = (
  message: string,
  eventType: EventType,
  displayedSummary?: boolean,
) => Promise<void>;

export async function executeToolHandler(params: {
  name: string;
  handler: ((args: any) => Promise<any>) | undefined;
  effectiveArgs: Record<string, unknown>;
  styleTokenKeySet: Set<string>;
  step: number;
  logger: Logger;
}): Promise<unknown> {
  const { name, handler, effectiveArgs, styleTokenKeySet, step, logger } = params;

  if (!handler) {
    return {
      success: false,
      error: `No handler registered for "${name}".`,
      error_detail: {
        name: "MissingToolHandlerError",
        message: `No handler registered for "${name}".`,
      },
    };
  }

  try {
    if (name === "update_global_styles") {
      const flatKeys = Object.keys(effectiveArgs ?? {}).filter((k) =>
        styleTokenKeySet.has(k),
      );
      if (flatKeys.length === 0) {
        return {
          success: false,
          error: "must include at least one token key/value",
          error_detail: {
            name: "InvalidToolArgumentsError",
            message:
              'update_global_styles requires at least one token key/value (e.g. { radius: "0.75rem" }).',
          },
          note: "Resend update_global_styles with at least one token key/value, or skip this tool call.",
        };
      }
    }
    return await handler(effectiveArgs);
  } catch (err) {
    logger(`AI tool: ${name} failed`, EVENT_TYPES.STEP_ERROR, true);
    console.error("Tool loop: handler threw", err, {
      tool: name,
      step,
    });
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      error_detail: serializeError(err),
      note: "Tool handler threw. Inspect error_detail and retry with corrected args or a different approach.",
    };
  }
}

export function postProcessToolResult(params: {
  name: string;
  toolResultRaw: unknown;
  effectiveArgs: Record<string, unknown>;
  readFileMeta: { start: number; end: number; wasCapped: boolean } | null;
  readFileDefaultMaxLines?: number;
}): unknown {
  const { name, toolResultRaw, effectiveArgs, readFileMeta, readFileDefaultMaxLines } = params;

  if (name === "read_file" && readFileMeta) {
    const path = typeof effectiveArgs.path === "string" ? effectiveArgs.path : "";

    const originalJsonPayload =
      (toolResultRaw as any)?.kind === "json"
        ? (toolResultRaw as any)?.json
        : undefined;

    if (originalJsonPayload !== undefined) {
      // Token-efficient: return JSON as structured data (no double-stringifying).
      return { path, json: originalJsonPayload };
    }

    const rawContent =
      typeof (toolResultRaw as any)?.content === "string"
        ? String((toolResultRaw as any).content)
        : typeof toolResultRaw === "string"
          ? toolResultRaw
          : JSON.stringify(toolResultRaw ?? null);

    return {
      path,
      start_line: readFileMeta.start,
      end_line: readFileMeta.end,
      truncated: readFileMeta.wasCapped,
      content: rawContent,
      note: readFileMeta.wasCapped
        ? `Capped to ${readFileDefaultMaxLines} lines. Request more with start_line/end_line.`
        : undefined,
    };
  }

  return toolResultRaw;
}
