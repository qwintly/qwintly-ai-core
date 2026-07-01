import { ToolStatusManager } from "./status/ToolStatusManager.js";

const manager = new ToolStatusManager();

export const buildToolStatusMessage = (
  name: string,
  effectiveArgs: Record<string, unknown>,
  readFileMeta: { start: number; end: number; wasCapped: boolean } | null,
): string => {
  return manager.getMessage(name, effectiveArgs, readFileMeta);
};
