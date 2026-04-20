export const MAX_AVATAR_FILE_MB = 8;
export const MAX_AVATAR_DATA_URL_CHARS = 380_000;

export function sanitizeAvatarDataUrl(input: any, maxChars = MAX_AVATAR_DATA_URL_CHARS): string | null {
  try {
    const s = String(input || "").trim();
    if (!s) return null;
    if (!s.startsWith("data:image/")) return null;
    if (s.length > maxChars) return null;
    return s;
  } catch {
    return null;
  }
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = () => reject(fr.error || new Error("read_failed"));
    fr.readAsDataURL(file);
  });
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image_load_failed"));
    img.src = dataUrl;
  });
}

async function renderVariant(dataUrl: string, maxSide: number, quality: number): Promise<string> {
  const img = await loadImage(dataUrl);
  const w = img.naturalWidth || img.width || 1;
  const h = img.naturalHeight || img.height || 1;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  ctx.drawImage(img, 0, 0, tw, th);
  const webp = canvas.toDataURL("image/webp", quality);
  return webp;
}

export type AvatarVariants = {
  thumbDataUrl: string;
  fullDataUrl: string;
  castDataUrl: string;
};

export async function fileToAvatarVariants(file: File): Promise<AvatarVariants> {
  if (!file) throw new Error("missing_file");
  if (file.size > MAX_AVATAR_FILE_MB * 1024 * 1024) throw new Error("avatar_file_too_big");
  const raw = await fileToDataUrl(file);
  const thumbDataUrl = sanitizeAvatarDataUrl(await renderVariant(raw, 128, 0.82), 140_000);
  const fullDataUrl = sanitizeAvatarDataUrl(await renderVariant(raw, 320, 0.88), 280_000);
  const castDataUrl = sanitizeAvatarDataUrl(await renderVariant(raw, 512, 0.9), 380_000);
  if (!thumbDataUrl || !fullDataUrl || !castDataUrl) throw new Error("avatar_variant_too_large");
  return { thumbDataUrl, fullDataUrl, castDataUrl };
}

export async function fileToSafeAvatarDataUrl(file: File): Promise<string> {
  return (await fileToAvatarVariants(file)).fullDataUrl;
}

export async function enforceSafeAvatarDataUrl(dataUrl: string): Promise<string | null> {
  const direct = sanitizeAvatarDataUrl(dataUrl);
  if (direct) return direct;
  if (!String(dataUrl || "").startsWith("data:image/")) return null;
  const variants = [
    { maxSide: 320, quality: 0.88, limit: 280_000 },
    { maxSide: 256, quality: 0.84, limit: 220_000 },
    { maxSide: 192, quality: 0.82, limit: 180_000 },
    { maxSide: 128, quality: 0.8, limit: 140_000 },
  ];
  for (const v of variants) {
    try {
      const next = await renderVariant(dataUrl, v.maxSide, v.quality);
      const safe = sanitizeAvatarDataUrl(next, v.limit);
      if (safe) return safe;
    } catch {}
  }
  return null;
}
