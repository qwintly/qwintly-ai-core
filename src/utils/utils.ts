export function assertNonEmptyString(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`\`${field}\` must be a non-empty string`);
  }
}
