export function estimateTokenCount(messages: any[]): number {
  let count = 0;
  for (const msg of messages) {
    if (!msg || !Array.isArray(msg.parts)) continue;
    for (const part of msg.parts) {
      if (!part) continue;
      if (typeof part.text === "string") {
        count += Math.ceil(part.text.length / 4);
      } else if (part.functionCall) {
        count += Math.ceil(JSON.stringify(part.functionCall).length / 4);
      } else if (part.functionResponse) {
        count += Math.ceil(JSON.stringify(part.functionResponse).length / 4);
      } else {
        count += Math.ceil(JSON.stringify(part).length / 4);
      }
    }
  }
  return count;
}
