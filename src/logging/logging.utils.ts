export type StatusErrorCode =
  | "INVALID_ARGUMENTS"
  | "PERSISTENCE_FAILED"
  | "REDIS_PUBLISH_FAILED";

export class StatusServiceError extends Error {
  public readonly code: StatusErrorCode;
  public readonly cause?: unknown;
  public readonly context?: Record<string, unknown>;

  constructor(
    code: StatusErrorCode,
    message: string,
    options?: { cause?: unknown; context?: Record<string, unknown> },
  ) {
    super(message);
    this.name = "StatusServiceError";
    this.code = code;
    this.cause = options?.cause;
    this.context = options?.context;
  }
}

export const assertNonEmpty = (value: string, field: string): void => {
  if (!value || !value.trim()) {
    throw new StatusServiceError(
      "INVALID_ARGUMENTS",
      `\`${field}\` must be a non-empty string`,
      { context: { field } },
    );
  }
};
