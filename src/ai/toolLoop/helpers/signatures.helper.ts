export function extractThoughtSignatures(response: any): Map<string, string> {
  try {
    const candidates = Array.isArray(response?.candidates)
      ? (response.candidates as any[])
      : [];
    const parts = candidates?.[0]?.content?.parts;
    const arr = Array.isArray(parts) ? (parts as any[]) : [];
    const map = new Map<string, string>();
    for (const p of arr) {
      const fc = p?.functionCall;
      const id = fc?.id;
      const sig = p?.thoughtSignature ?? p?.thought_signature;
      if (typeof id === "string" && typeof sig === "string" && sig) {
        map.set(id, sig);
      }
    }
    return map;
  } catch {
    return new Map<string, string>();
  }
}
