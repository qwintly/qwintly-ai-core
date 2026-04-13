import crypto from "node:crypto";
export const DEFAULT_CONTEXT_POLICY = {
    readFileDefaultMaxLines: 200,
    tailMessages: 12,
    maxModelChars: 120000,
    logApproxModelChars: false,
};
const sha256Hex = (value) => crypto.createHash("sha256").update(value, "utf8").digest("hex");
const extractPatchFiles = (patchString) => {
    const lines = patchString.replace(/\r\n/g, "\n").split("\n");
    const files = new Set();
    for (const line of lines) {
        const match = /^\*\*\* (Update File|Add File|Delete File):\s+(.+)$/.exec(line) ??
            /^\*\*\* Move to:\s+(.+)$/.exec(line);
        if (!match)
            continue;
        const filePath = (match[2] ?? match[1] ?? "").trim();
        if (filePath)
            files.add(filePath);
    }
    return [...files];
};
export const redactFunctionCallArgs = (name, args) => {
    if (name !== "apply_patch")
        return args;
    const patch = typeof args.patch_string === "string" ? args.patch_string : "";
    if (!patch) {
        return {
            ...args,
            patch_string: { omitted: true, chars: 0, sha256: sha256Hex(""), files: [] },
        };
    }
    return {
        ...args,
        patch_string: {
            omitted: true,
            chars: patch.length,
            sha256: sha256Hex(patch),
            files: extractPatchFiles(patch),
        },
    };
};
const isMemoryMessage = (item) => {
    const text = item?.parts?.[0]?.text;
    return (item?.role === "model" &&
        typeof text === "string" &&
        text.startsWith("MEMORY (tool trace summary):"));
};
const buildMemoryText = (events) => {
    if (events.length === 0)
        return "";
    const lines = events.map((e) => `- ${e.summary}`);
    return `MEMORY (tool trace summary):\n${lines.join("\n")}`;
};
export const compactForModel = (input) => {
    const { initialCount, modelContents, toolEvents, policy } = input;
    const withoutOldMemory = modelContents.filter((c) => !isMemoryMessage(c));
    const tailStart = Math.max(initialCount, withoutOldMemory.length - policy.tailMessages);
    const initial = withoutOldMemory.slice(0, initialCount);
    const tail = withoutOldMemory.slice(tailStart);
    const memoryText = buildMemoryText(toolEvents);
    const memory = memoryText
        ? [{ role: "model", parts: [{ text: memoryText }] }]
        : [];
    let compacted = [...initial, ...memory, ...tail];
    const maxChars = Math.max(10000, policy.maxModelChars);
    while (JSON.stringify(compacted).length > maxChars) {
        const minLen = initial.length + memory.length + 1;
        if (compacted.length <= minLen)
            break;
        compacted = [
            ...initial,
            ...memory,
            ...compacted.slice(initial.length + memory.length + 1),
        ];
    }
    return compacted;
};
export const normalizeReadFileArgs = (args, maxLines) => {
    const requestedStart = args.start_line === undefined || args.start_line === null
        ? 1
        : Number(args.start_line);
    const requestedEnd = args.end_line === undefined || args.end_line === null
        ? undefined
        : Number(args.end_line);
    const start = Number.isFinite(requestedStart) && requestedStart > 0 ? requestedStart : 1;
    const cap = Math.max(1, Math.floor(maxLines));
    const desiredEnd = requestedEnd === undefined ||
        !Number.isFinite(requestedEnd) ||
        requestedEnd < start
        ? start + cap - 1
        : requestedEnd;
    const cappedEnd = Math.min(desiredEnd, start + cap - 1);
    const wasCapped = requestedEnd === undefined ||
        desiredEnd !== requestedEnd ||
        cappedEnd !== desiredEnd;
    return {
        effectiveArgs: { ...args, start_line: start, end_line: cappedEnd },
        start,
        end: cappedEnd,
        wasCapped,
    };
};
export const getApplyPatchEventMeta = (args) => {
    const patch = typeof args.patch_string === "string" ? args.patch_string : "";
    return {
        chars: patch.length,
        sha256: sha256Hex(patch),
        files: extractPatchFiles(patch),
    };
};
//# sourceMappingURL=toolLoopContext.js.map