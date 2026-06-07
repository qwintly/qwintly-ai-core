export const serializeError = (err: unknown) => {
  if (err instanceof Error) {
    const cause = (err as any).cause as unknown;
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      cause:
        cause instanceof Error
          ? {
              name: cause.name,
              message: cause.message,
              stack: cause.stack,
            }
          : cause,
    };
  }

  return {
    name: typeof err,
    message: typeof err === "string" ? err : "Non-Error thrown",
    value: err,
  };
};

const isSingleNodeTransient = (node: any): boolean => {
  if (!node) return false;
  const code =
    node.error?.code ?? node.code ?? node.statusCode ?? node.response?.status;

  const status =
    node.error?.status ?? node.status ?? node.response?.data?.error?.status;

  const message =
    node.error?.message ??
    node.message ??
    node.response?.data?.error?.message;

  const msg = typeof message === "string" ? message.toLowerCase() : "";
  const stat = typeof status === "string" ? status.toUpperCase() : "";

  return (
    code === 503 ||
    code === 429 ||
    stat === "UNAVAILABLE" ||
    stat === "RESOURCE_EXHAUSTED" ||
    msg.includes("high demand") ||
    msg.includes("try again later") ||
    msg.includes("temporar")
  );
};

export const isTransientAiCallError = (err: unknown) => {
  let cur: any = err as any;
  for (let depth = 0; depth < 4 && cur; depth++) {
    if (isSingleNodeTransient(cur)) return true;
    cur = cur.cause;
  }

  return false;
};
