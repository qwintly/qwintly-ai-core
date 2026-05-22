import path from "node:path";
import { toWorkspacePath } from "../helpers/fileSystem.helpers.js";
import { writeFileAtomic } from "../helpers/pageConfigJson.helpers.js";
import {
  assertStyleConfig,
  defaultStyleConfigJson,
  STYLE_TOKEN_KEYS,
  type StyleConfig,
  type StyleTokenKey,
} from "../../../types/styleConfig.js";
import { type WorkspaceDeps } from "./workspaceDeps.js";

type UpdateGlobalStylesArgs = {
  tokens: Partial<Record<StyleTokenKey, string>>;
};

const STYLE_CONFIG_REL_PATH = path.posix.join("app", "styleConfig.json");

const parseStyleConfigOrDefault = (raw: string): StyleConfig => {
  try {
    const parsed = JSON.parse(String(raw ?? ""));
    return assertStyleConfig(parsed);
  } catch {
    return assertStyleConfig(defaultStyleConfigJson);
  }
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const createUpdateGlobalStylesImpl = (deps: WorkspaceDeps) => {
  const { workspaceRoot, fs } = deps;

  return async (args: UpdateGlobalStylesArgs) => {
    const tokensPatch = (args as any)?.tokens;
    if (!isPlainObject(tokensPatch)) {
      return { success: false, error: "invalid tokens" };
    }

    const allowedKeys = new Set<string>(STYLE_TOKEN_KEYS as unknown as string[]);
    const patchKeys = Object.keys(tokensPatch);
    if (patchKeys.length === 0) {
      return { success: false, error: "tokens patch must not be empty" };
    }
    const unknownKeys = patchKeys.filter((k) => !allowedKeys.has(k));
    if (unknownKeys.length > 0) {
      return {
        success: false,
        error: `unknown token keys: ${unknownKeys.sort().join(", ")}`,
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
