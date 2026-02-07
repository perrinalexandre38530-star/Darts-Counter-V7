// ============================================
// src/lib/sync/PayloadChunk.ts
// Utilities: hash + chunk/un-chunk JSON payloads
// - Used for multi-device match resume (EventBuffer)
// ============================================

// NOTE: on reste volontairement simple (pas de crypto) pour éviter les polyfills.

export function hashStringDjb2(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h) ^ input.charCodeAt(i); // h*33 XOR c
  }
  // unsigned 32-bit
  return (h >>> 0).toString(16);
}

export function chunkString(input: string, chunkSize = 90_000): string[] {
  if (!input) return [""];
  const size = Math.max(1_000, Math.floor(chunkSize));
  const out: string[] = [];
  for (let i = 0; i < input.length; i += size) {
    out.push(input.slice(i, i + size));
  }
  return out;
}

export function joinChunks(chunks: string[]): string {
  return chunks.join("");
}

export function safeJsonStringify(value: any): string {
  try {
    return JSON.stringify(value);
  } catch {
    // fallback ultra safe (évite crash)
    try {
      return String(value);
    } catch {
      return "";
    }
  }
}
