export type StatusMessageInput = {
  name: string;
  effectiveArgs: Record<string, unknown>;
  readFileMeta: { start: number; end: number; wasCapped: boolean } | null;
};

export type StatusMessageBuilder = (input: StatusMessageInput) => string | null;
