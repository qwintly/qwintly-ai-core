import path from "node:path";

export type ApplyPatchOperation =
  | {
      kind: "update";
      filePath: string;
      moveTo?: string;
      hunks: PatchHunk[];
    }
  | {
      kind: "add";
      filePath: string;
      hunks: PatchHunk[];
    }
  | {
      kind: "delete";
      filePath: string;
    };

type PatchLine =
  | { kind: "context"; text: string }
  | { kind: "add"; text: string }
  | { kind: "delete"; text: string };

export type PatchHunk = {
  label?: string;
  anchorEOF?: boolean;
  lines: PatchLine[];
};

const normalizeNewlines = (value: string) => value.replace(/\r\n/g, "\n");

const normalizeLineForLooseMatch = (value: string) =>
  value
    .replace(/[ \t]+$/g, "")
    .replace(/;$/g, "")
    .replace(/['"]/g, '"');

const normalizeLineForWhitespaceAgnosticMatch = (value: string) =>
  normalizeLineForLooseMatch(value).trim().replace(/\s+/g, " ");

const stripOuterMarkdownCodeFence = (value: string) => {
  const lines = value.split("\n");

  let start = 0;
  while (start < lines.length && !lines[start].trim()) start += 1;

  let end = lines.length - 1;
  while (end >= 0 && !lines[end].trim()) end -= 1;

  if (start >= end) return value;

  const first = lines[start].trim();
  const last = lines[end].trim();

  const isFenceStart = /^```[a-zA-Z0-9_-]*\s*$/.test(first);
  const isFenceEnd = last === "```";

  if (!isFenceStart || !isFenceEnd) return value;

  return lines.slice(start + 1, end).join("\n");
};

const dedentBlock = (value: string) => {
  const lines = value.split("\n");
  let minIndent: number | null = null;

  for (const line of lines) {
    if (!line.trim()) continue;
    const match = /^[ \t]+/.exec(line);
    const indent = match ? match[0].length : 0;
    minIndent = minIndent === null ? indent : Math.min(minIndent, indent);
    if (minIndent === 0) break;
  }

  if (!minIndent) return value;
  return lines
    .map((line) => {
      if (!line.trim()) return line;
      return line.slice(minIndent);
    })
    .join("\n");
};

const preprocessPatchString = (patchString: string) => {
  const normalized = normalizeNewlines(patchString ?? "");
  return dedentBlock(stripOuterMarkdownCodeFence(normalized));
};

export function parseApplyPatch(patchString: string): ApplyPatchOperation[] {
  const preprocessed = preprocessPatchString(patchString);
  const rawLines = preprocessed.split("\n");

  let startIndex = 0;
  while (startIndex < rawLines.length && !rawLines[startIndex].trim()) {
    startIndex += 1;
  }
  if (
    startIndex >= rawLines.length ||
    rawLines[startIndex].replace(/^\uFEFF/, "").trim() !== "*** Begin Patch"
  ) {
    throw new Error('Invalid patch: missing "*** Begin Patch" header.');
  }

  let endIndex = -1;
  for (let idx = rawLines.length - 1; idx >= startIndex; idx -= 1) {
    if (rawLines[idx].trim() === "*** End Patch") {
      endIndex = idx;
      break;
    }
  }
  if (endIndex === -1) endIndex = rawLines.length;

  const hasFooter = endIndex !== rawLines.length;
  const hasNonEmptyAfterFooter = hasFooter
    ? rawLines.slice(endIndex + 1).some((line) => Boolean(line.trim()))
    : false;
  const lines =
    hasFooter && !hasNonEmptyAfterFooter
      ? rawLines.slice(startIndex + 1, endIndex)
      : rawLines.slice(startIndex + 1);
  const operations: ApplyPatchOperation[] = [];

  const isOpHeader = (line: string) =>
    line.startsWith("*** Add File:") ||
    line.startsWith("*** Update File:") ||
    line.startsWith("*** Delete File:");

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "*** End Patch") {
      i += 1;
      continue;
    }
    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (!isOpHeader(line)) {
      throw new Error(`Invalid patch: expected file header at line ${i + 2}.`);
    }

    if (line.startsWith("*** Add File:") || line.startsWith("*** Update File:")) {
      const kind = line.startsWith("*** Add File:") ? "add" : "update";
      const headerLength = line.startsWith("*** Add File:")
        ? "*** Add File:".length
        : "*** Update File:".length;
      const filePath = line.slice(headerLength).trim();
      if (!filePath) {
        throw new Error(
          `Invalid patch: empty ${kind === "add" ? "Add" : "Update"} File path.`,
        );
      }
      i += 1;

      let moveTo: string | undefined;
      if (i < lines.length && lines[i].startsWith("*** Move to:")) {
        if (kind !== "update") {
          throw new Error(`Invalid patch: Move operations are only allowed for Update File.`);
        }
        moveTo = lines[i].slice("*** Move to:".length).trim();
        if (!moveTo) throw new Error(`Invalid patch: empty Move to path.`);
        i += 1;
      }

      const hunks: PatchHunk[] = [];
      let currentHunk: PatchHunk | null = null;

      const pushHunk = () => {
        if (!currentHunk) return;
        if (currentHunk.lines.length === 0 && !currentHunk.anchorEOF) return;
        hunks.push(currentHunk);
      };

      while (i < lines.length && !isOpHeader(lines[i])) {
        const current = lines[i];
        if (!currentHunk) currentHunk = { lines: [] };

        if (current.trim() === "*** End Patch") {
          i += 1;
          continue;
        }

        if (current === "*** End of File") {
          currentHunk.anchorEOF = true;
          i += 1;
          continue;
        }

        if (current.startsWith("@@")) {
          pushHunk();
          currentHunk = { label: current.slice(2).trim() || undefined, lines: [] };
          i += 1;
          continue;
        }

        const prefix = current.slice(0, 1);

        // Tolerate a common patch style:
        // - For "*** Add File:", unprefixed lines are treated as additions (full line content preserved).
        // - For "*** Update File:", unprefixed lines are treated as context (full line content preserved).
        if (kind === "add") {
          if (prefix === "+") {
            currentHunk.lines.push({ kind: "add", text: current.slice(1) });
          } else if (prefix === "-") {
            currentHunk.lines.push({ kind: "delete", text: current.slice(1) });
          } else {
            currentHunk.lines.push({ kind: "add", text: current });
          }
          i += 1;
          continue;
        }

        // update
        if (prefix === " ") currentHunk.lines.push({ kind: "context", text: current.slice(1) });
        else if (prefix === "+") currentHunk.lines.push({ kind: "add", text: current.slice(1) });
        else if (prefix === "-") currentHunk.lines.push({ kind: "delete", text: current.slice(1) });
        else currentHunk.lines.push({ kind: "context", text: current });
        i += 1;
      }

      pushHunk();
      operations.push({ kind, filePath, moveTo, hunks } as any);
      continue;
    }

    if (line.startsWith("*** Delete File:")) {
      const filePath = line.slice("*** Delete File:".length).trim();
      if (!filePath) throw new Error("Invalid patch: empty Delete File path.");
      operations.push({ kind: "delete", filePath });
      i += 1;
      continue;
    }
  }

  return operations;
}

const findSubsequence = (
  haystack: string[],
  needle: string[],
  startIndex: number,
  anchorEOF: boolean,
) => {
  if (needle.length === 0) return anchorEOF ? haystack.length : startIndex;

  const lastStart = haystack.length - needle.length;
  const from = Math.max(0, Math.min(startIndex, haystack.length));
  const candidates = anchorEOF ? [lastStart] : Array.from({ length: lastStart - from + 1 }, (_, i) => from + i);

  for (const pos of candidates) {
    if (pos < 0 || pos > lastStart) continue;
    let ok = true;
    for (let i = 0; i < needle.length; i++) {
      if ((haystack[pos + i] ?? "") !== needle[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return pos;
  }

  return -1;
};

type HunkSearchResult = { pos: number; mode: "strict" | "loose" | "ws" };

const findHunkPosition = (
  fileLines: string[],
  expected: string[],
  cursor: number,
  requireEnd: boolean,
): HunkSearchResult => {
  const strictFromCursor = requireEnd
    ? findSubsequence(fileLines, expected, 0, true)
    : findSubsequence(fileLines, expected, cursor, false);
  if (strictFromCursor !== -1) return { pos: strictFromCursor, mode: "strict" };

  if (!requireEnd) {
    const strictFromStart = findSubsequence(fileLines, expected, 0, false);
    if (strictFromStart !== -1) return { pos: strictFromStart, mode: "strict" };
  }

  const looseFileLines = fileLines.map(normalizeLineForLooseMatch);
  const looseExpected = expected.map(normalizeLineForLooseMatch);

  const looseFromCursor = requireEnd
    ? findSubsequence(looseFileLines, looseExpected, 0, true)
    : findSubsequence(looseFileLines, looseExpected, cursor, false);
  if (looseFromCursor !== -1) return { pos: looseFromCursor, mode: "loose" };

  if (!requireEnd) {
    const looseFromStart = findSubsequence(looseFileLines, looseExpected, 0, false);
    if (looseFromStart !== -1) return { pos: looseFromStart, mode: "loose" };
  }

  const wsFileLines = fileLines.map(normalizeLineForWhitespaceAgnosticMatch);
  const wsExpected = expected.map(normalizeLineForWhitespaceAgnosticMatch);

  const wsFromCursor = requireEnd
    ? findSubsequence(wsFileLines, wsExpected, 0, true)
    : findSubsequence(wsFileLines, wsExpected, cursor, false);
  if (wsFromCursor !== -1) return { pos: wsFromCursor, mode: "ws" };

  if (!requireEnd) {
    const wsFromStart = findSubsequence(wsFileLines, wsExpected, 0, false);
    if (wsFromStart !== -1) return { pos: wsFromStart, mode: "ws" };
  }

  return { pos: -1, mode: "strict" };
};

export function applyHunksToContent(
  content: string,
  hunks: PatchHunk[],
): { content: string; changed: boolean } {
  const normalized = normalizeNewlines(content);
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const endsWithNewline = normalized.endsWith("\n");
  const fileLines = normalized.split("\n");

  let cursor = 0;
  let changed = false;

  for (const hunk of hunks) {
    const expected = hunk.lines
      .filter((l) => l.kind === "context" || l.kind === "delete")
      .map((l) => l.text);

    const requireEnd = Boolean(hunk.anchorEOF);
    const { pos, mode } = findHunkPosition(fileLines, expected, cursor, requireEnd);

    if (pos === -1) {
      const preview = expected.slice(0, 3).join("\\n");
      throw new Error(
        `Patch hunk failed to apply${hunk.label ? ` (${hunk.label})` : ""}: context not found. Expected (first lines): ${preview}`,
      );
    }

    const linesEqual = (a: string, b: string) => {
      if (mode === "strict") return a === b;
      if (mode === "loose") {
        return normalizeLineForLooseMatch(a) === normalizeLineForLooseMatch(b);
      }
      return (
        normalizeLineForWhitespaceAgnosticMatch(a) ===
        normalizeLineForWhitespaceAgnosticMatch(b)
      );
    };

    let idx = pos;
    for (const line of hunk.lines) {
      if (line.kind === "context") {
        if (!linesEqual(fileLines[idx] ?? "", line.text)) {
          throw new Error(
            `Patch context mismatch at line ${idx + 1}: expected "${line.text}"`,
          );
        }
        idx += 1;
        continue;
      }

      if (line.kind === "delete") {
        if (!linesEqual(fileLines[idx] ?? "", line.text)) {
          throw new Error(
            `Patch delete mismatch at line ${idx + 1}: expected "${line.text}"`,
          );
        }
        fileLines.splice(idx, 1);
        changed = true;
        continue;
      }

      if (line.kind === "add") {
        fileLines.splice(idx, 0, line.text);
        idx += 1;
        changed = true;
      }
    }

    cursor = idx;
  }

  let next = fileLines.join("\n");
  if (endsWithNewline && !next.endsWith("\n")) next += "\n";
  next = next.replace(/\n/g, newline);

  return { content: next, changed };
}

export function isTextFilePath(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  return ext !== ".png" && ext !== ".jpg" && ext !== ".jpeg" && ext !== ".gif";
}
