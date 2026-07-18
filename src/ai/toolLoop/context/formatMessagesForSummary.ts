export function formatMessagesForSummary(messages: any[]): string {
  return messages
    .map((msg) => {
      const role = msg.role === "model" ? "Assistant" : "User";
      const partsText = msg.parts
        .map((part: any) => {
          if (part.text) {
            return part.text;
          }
          if (part.functionCall) {
            return `Called tool "${part.functionCall.name}" with args: ${JSON.stringify(
              part.functionCall.args,
            )}`;
          }
          if (part.functionResponse) {
            return `Tool "${
              part.functionResponse.name
            }" responded: ${JSON.stringify(part.functionResponse.response)}`;
          }
          return "";
        })
        .filter(Boolean)
        .join("\n");
      return `[${role}]:\n${partsText}`;
    })
    .join("\n\n");
}
