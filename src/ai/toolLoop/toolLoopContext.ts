
export type ToolEvent = {
  name: string;
  summary: string;
};

export type ToolLoopContextPolicy = {
  readFileDefaultMaxLines?: number;
  tailMessages?: number;
  maxModelChars?: number;
  logApproxModelChars?: boolean;
};

export const DEFAULT_CONTEXT_POLICY: Required<ToolLoopContextPolicy> = {
  readFileDefaultMaxLines: 200,
  tailMessages: 8,
  maxModelChars: 120_000,
  logApproxModelChars: false,
};


const isMemoryMessage = (item: any) => {
  const text = item?.parts?.[0]?.text;
  return (
    item?.role === "model" &&
    typeof text === "string" &&
    text.startsWith("MEMORY (tool trace summary):")
  );
};

const buildMemoryText = (events: ToolEvent[]) => {
  if (events.length === 0) return "";
  const lines = events.map((e) => `- ${e.summary}`);
  return `MEMORY (tool trace summary):\n${lines.join("\n")}`;
};

export const compactForModel = (input: {
  initialCount: number;
  modelContents: any[];
  toolEvents: ToolEvent[];
  policy: Required<ToolLoopContextPolicy>;
}) => {
  const { initialCount, modelContents, toolEvents, policy } = input;

  const withoutOldMemory = modelContents.filter((c) => !isMemoryMessage(c));
  const tailStart = Math.max(
    initialCount,
    withoutOldMemory.length - policy.tailMessages,
  );

  const initial = withoutOldMemory.slice(0, initialCount);
  const tail = withoutOldMemory.slice(tailStart);
  const memoryText = buildMemoryText(toolEvents);
  const memory = memoryText
    ? [{ role: "model", parts: [{ text: memoryText }] }]
    : [];

  let compacted = [...initial, ...memory, ...tail];

  const maxChars = Math.max(10_000, policy.maxModelChars);
  while (JSON.stringify(compacted).length > maxChars) {
    const minLen = initial.length + memory.length + 1;
    if (compacted.length <= minLen) break;
    compacted = [
      ...initial,
      ...memory,
      ...compacted.slice(initial.length + memory.length + 1),
    ];
  }

  return compacted;
};
