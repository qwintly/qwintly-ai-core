import { isPlainObject } from "../../../utils/utils.js";
import { normalizeReadFileArgs } from "./readFile.helpers.js";

function normalizeUpdateGlobalStylesArgs(
  args: Record<string, unknown>,
  styleTokenKeySet: Set<string>
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  const tokensMaybe = args?.tokens;
  if (isPlainObject(tokensMaybe)) {
    for (const [k, v] of Object.entries(tokensMaybe)) {
      if (styleTokenKeySet.has(k) && typeof v === "string") {
        normalized[k] = v;
      }
    }
  }

  for (const [k, v] of Object.entries(args ?? {})) {
    if (styleTokenKeySet.has(k) && typeof v === "string") {
      normalized[k] = v;
    }
  }

  return normalized;
}

export function normalizeToolArgs(
  name: string,
  args: Record<string, unknown>,
  options: {
    readFileDefaultMaxLines: number;
    styleTokenKeySet: Set<string>;
  }
): {
  effectiveArgs: Record<string, unknown>;
  readFileMeta: {
    start: number;
    end: number;
    wasCapped: boolean;
  } | null;
} {
  if (name === "read_file") {
    const normalized = normalizeReadFileArgs(
      args,
      options.readFileDefaultMaxLines,
    );
    return {
      effectiveArgs: normalized.effectiveArgs,
      readFileMeta: {
        start: normalized.start,
        end: normalized.end,
        wasCapped: normalized.wasCapped,
      },
    };
  }

  if (name === "update_global_styles") {
    return {
      effectiveArgs: normalizeUpdateGlobalStylesArgs(args, options.styleTokenKeySet),
      readFileMeta: null,
    };
  }

  return { effectiveArgs: args, readFileMeta: null };
}
