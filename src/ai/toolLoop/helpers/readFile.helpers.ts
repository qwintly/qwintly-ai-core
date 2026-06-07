export const normalizeReadFileArgs = (
  args: Record<string, unknown>,
  maxLines: number,
) => {
  const requestedStart =
    args.start_line === undefined || args.start_line === null
      ? 1
      : Number(args.start_line);

  const requestedEnd =
    args.end_line === undefined || args.end_line === null
      ? undefined
      : Number(args.end_line);

  const start =
    Number.isFinite(requestedStart) && requestedStart > 0 ? requestedStart : 1;
  const cap = Math.max(1, Math.floor(maxLines));

  const desiredEnd =
    requestedEnd === undefined ||
    !Number.isFinite(requestedEnd) ||
    requestedEnd < start
      ? start + cap - 1
      : requestedEnd;

  const cappedEnd = Math.min(desiredEnd, start + cap - 1);
  const wasCapped =
    requestedEnd === undefined ||
    desiredEnd !== requestedEnd ||
    cappedEnd !== desiredEnd;

  return {
    effectiveArgs: { ...args, start_line: start, end_line: cappedEnd },
    start,
    end: cappedEnd,
    wasCapped,
  };
};
