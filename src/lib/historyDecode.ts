// ============================================
// src/lib/historyDecode.ts
// Decode payload history :
// - JSON direct
// - base64 -> gzip (DecompressionStream) -> JSON
// - fallback LZString global (window.LZString) si présent
// ============================================

export async function decodeHistoryPayload(raw: any): Promise<any | null> {
  // ✅ Certains stockages (IDB / migrations) peuvent contenir l'objet déjà décodé.
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  if (typeof raw !== "string") return null;

  const tryParse = (s: any) => {
    if (typeof s !== "string") return null;
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  // 0) JSON clair
  const direct = tryParse(raw);
  if (direct) return direct;

  // 1) base64 -> gzip -> json
  try {
    const bin = atob(raw);
    const buf = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const DS: any = (window as any).DecompressionStream;

    if (typeof DS === "function") {
      const ds = new DS("gzip");
      const stream = new Blob([buf]).stream().pipeThrough(ds);
      const resp = new Response(stream);
      return await resp.json();
    }

    // fallback sans gzip : parfois JSON base64
    const parsed = tryParse(bin);
    if (parsed) return parsed;
  } catch {
    // ignore
  }

  // 2) fallback LZString global (PAS de dépendance npm)
  try {
    const LZ: any = (window as any).LZString;
    if (LZ) {
      const s1 = typeof LZ.decompressFromUTF16 === "function" ? LZ.decompressFromUTF16(raw) : null;
      const p1 = tryParse(s1);
      if (p1) return p1;

      const s2 = typeof LZ.decompressFromBase64 === "function" ? LZ.decompressFromBase64(raw) : null;
      const p2 = tryParse(s2);
      if (p2) return p2;

      const s3 = typeof LZ.decompress === "function" ? LZ.decompress(raw) : null;
      const p3 = tryParse(s3);
      if (p3) return p3;
    }
  } catch {
    // ignore
  }

  return null;
}
