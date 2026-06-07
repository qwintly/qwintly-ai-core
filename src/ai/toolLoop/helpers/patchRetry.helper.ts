export function handleApplyPatchFailure(params: {
  toolResult: any;
  applyPatchAutoRetryMax: number;
  applyPatchRetryCount: number;
  keepFullTrace: boolean;
  fullTraceContents: any[];
  modelContents: any[];
}): { applyPatchRetryCount: number } {
  let { applyPatchRetryCount, toolResult, applyPatchAutoRetryMax, keepFullTrace, fullTraceContents, modelContents } = params;

  applyPatchRetryCount += 1;

  const error = String(toolResult?.error ?? "unknown error");
  const debugFiles = Array.isArray(toolResult?.debug?.files)
    ? (toolResult.debug.files as Array<{
        path?: string;
        head?: string;
      }>)
    : [];

  const debugText =
    debugFiles.length > 0
      ? `\n\nFILE SNAPSHOTS (for regenerating the patch):\n${debugFiles
          .slice(0, 3)
          .map(
            (f) =>
              `--- ${String(f.path ?? "")} ---\n${String(
                f.head ?? "",
              )}\n--- end ---`,
          )
          .join("\n\n")}`
      : "";

  const retryInstruction = {
    role: "user",
    parts: [
      {
        text:
          `apply_patch failed (attempt ${applyPatchRetryCount}/${applyPatchAutoRetryMax}): ${error}\n` +
          `Regenerate a patch that matches the current file contents. ` +
          `For large rewrites, prefer write_file(path, content) or Delete+Add instead of Update.` +
          debugText,
      },
    ],
  };

  if (keepFullTrace) fullTraceContents.push(retryInstruction);
  modelContents.push(retryInstruction);

  return { applyPatchRetryCount };
}
