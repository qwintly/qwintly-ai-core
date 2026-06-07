import path from "node:path";
import { toWorkspacePath } from "../helpers/fileSystem.helpers.js";
import { writeFileAtomic } from "../helpers/pageConfigJson.helpers.js";
import {
  assertStyleConfig,
  defaultStyleConfigJson,
  type StyleConfig,
  type StyleTokenKey,
  STYLE_TOKEN_KEYS,
} from "../../../types/styleConfig.js";
import { type WorkspaceDeps } from "./workspaceDeps.js";

const STYLE_CONFIG_REL_PATH = path.posix.join("app", "styleConfig.json");

const parseStyleConfigOrDefault = (raw: string): StyleConfig => {
  try {
    const parsed = JSON.parse(String(raw ?? ""));
    return assertStyleConfig(parsed);
  } catch {
    return assertStyleConfig(defaultStyleConfigJson);
  }
};

const isSafeCssValue = (value: string): boolean => {
  if (!value.trim()) return false;
  if (value.includes("<") || value.includes(">")) return false;
  if (value.toLowerCase().includes("</style")) return false;
  return true;
};

const extractAllValidTokens = (value: unknown): Partial<Record<StyleTokenKey, string>> => {
  const allowed = new Set<string>(STYLE_TOKEN_KEYS as unknown as string[]);
  const out: Record<string, string> = {};
  const visited = new WeakSet<object>();

  const traverse = (val: unknown) => {
    if (typeof val === "string") {
      const trimmedVal = val.trim();
      if (!trimmedVal) return;

      // Try to parse string as JSON first
      try {
        const parsed = JSON.parse(trimmedVal);
        traverse(parsed);
        return;
      } catch {}

      // If it's a string and not valid JSON, try to extract key-value patterns (e.g. key: "value", "key": 'value', etc.)
      const regex = /(?:(?:["']([a-zA-Z0-9_-]+)["']|([a-zA-Z0-9_-]+))\s*:\s*["']([^"']+)["'])/g;
      let match;
      let foundAny = false;
      while ((match = regex.exec(trimmedVal)) !== null) {
        const k = match[1] ?? match[2];
        const v = match[3];
        if (k && allowed.has(k) && isSafeCssValue(v)) {
          out[k] = v.trim();
          foundAny = true;
        }
      }
      if (foundAny) return;

      // As a last resort, if the string itself is a safe value and allowed keys can be matched elsewhere,
      // or if we want to handle a plain string value, but without a key we can't map it.
      return;
    }

    if (typeof val !== "object" || val === null) return;
    if (visited.has(val)) return;
    visited.add(val);

    if (Array.isArray(val)) {
      for (const item of val) {
        traverse(item);
      }
      return;
    }

    for (const [k, v] of Object.entries(val)) {
      if (allowed.has(k) && typeof v === "string" && isSafeCssValue(v)) {
        out[k] = v.trim();
      } else {
        traverse(v);
      }
    }
  };

  traverse(value);
  return out as any;
};

export const createUpdateGlobalStylesImpl = (deps: WorkspaceDeps) => {
  const { workspaceRoot, fs } = deps;

  return async (rawArgs: unknown) => {
    const normalizedArgs: unknown = (() => {
      if (typeof rawArgs !== "string") return rawArgs;
      try {
        return JSON.parse(rawArgs);
      } catch {
        return rawArgs;
      }
    })();

    const tokensPatch = extractAllValidTokens(normalizedArgs);

    if (Object.keys(tokensPatch).length === 0) {
      return {
        success: false,
        error: "invalid args",
        error_detail: {
          formErrors: ["must include at least one token key/value"],
          fieldErrors: {},
        },
        note: "update_global_styles requires at least one valid token key/value (e.g. { primary: \"oklch(...)\" }).",
      };
    }


    const configPath = toWorkspacePath(workspaceRoot, STYLE_CONFIG_REL_PATH);

    let beforeConfig: StyleConfig;
    let existed = true;
    try {
      const raw = await fs.readFile(configPath);
      beforeConfig = parseStyleConfigOrDefault(raw);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException | null)?.code;
      if (code !== "ENOENT") {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
      existed = false;
      beforeConfig = assertStyleConfig(defaultStyleConfigJson);
    }

    const merged: StyleConfig = {
      version: beforeConfig.version,
      tokens: {
        ...beforeConfig.tokens,
        ...(tokensPatch as Partial<Record<StyleTokenKey, string>>),
      } as any,
    };

    let validated: StyleConfig;
    try {
      validated = assertStyleConfig(merged);
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    const nextVersion = Number.isFinite(validated.version)
      ? validated.version + 1
      : 1;
    const afterConfig: StyleConfig = { ...validated, version: nextVersion };

    const after = JSON.stringify(afterConfig, null, 2) + "\n";
    try {
      await writeFileAtomic(configPath, after);
      return {
        success: true,
        changed: true,
        file: STYLE_CONFIG_REL_PATH,
        version: nextVersion,
        created: !existed,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  };
};
