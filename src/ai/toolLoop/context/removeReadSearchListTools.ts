export function removeReadSearchListTools(messages: any[]): any[] {
  return messages
    .map((msg) => {
      if (!msg || !Array.isArray(msg.parts)) return null;
      const filteredParts = msg.parts.filter((part: any) => {
        if (part.functionCall) {
          const name = part.functionCall.name;
          if (name === "read_file" || name === "list_dir" || name === "search") {
            return false;
          }
        }
        if (part.functionResponse) {
          const name = part.functionResponse.name;
          if (name === "read_file" || name === "list_dir" || name === "search") {
            return false;
          }
        }
        return true;
      });
      if (filteredParts.length === 0) return null;
      return {
        ...msg,
        parts: filteredParts,
      };
    })
    .filter(Boolean);
}
