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

async function bitmapFromFile(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {}
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = () => reject(fr.error || new Error("read_failed"));
    fr.readAsDataURL(file);
  });
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image_load_failed"));
    img.src = dataUrl;
  });
}

function renderBitmapToDataUrl(img: any, maxSide: number, quality: number): string {
  const w = img.naturalWidth || img.videoWidth || img.width || 1;
  const h = img.naturalHeight || img.videoHeight || img.height || 1;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  ctx.drawImage(img, 0, 0, tw, th);
  return canvas.toDataURL("image/webp", quality);
}

export type AvatarVariants = {
  thumbDataUrl: string;
  fullDataUrl: string;
  castDataUrl: string;
};

export async function fileToAvatarVariants(file: File): Promise<AvatarVariants> {
  if (!file) throw new Error("missing_file");
  if (file.size > MAX_AVATAR_FILE_MB * 1024 * 1024) throw new Error("avatar_file_too_big");
  const bitmap = await bitmapFromFile(file);
  const thumbDataUrl = sanitizeAvatarDataUrl(renderBitmapToDataUrl(bitmap, 160, 0.84), 180_000);
  const fullDataUrl = sanitizeAvatarDataUrl(renderBitmapToDataUrl(bitmap, 320, 0.86), 280_000);
  const castDataUrl = sanitizeAvatarDataUrl(renderBitmapToDataUrl(bitmap, 320, 0.86), 280_000);
  try { (bitmap as any).close?.(); } catch {}
  if (!thumbDataUrl || !fullDataUrl || !castDataUrl) throw new Error("avatar_variant_too_large");
  return { thumbDataUrl, fullDataUrl, castDataUrl };
}

export async function fileToSafeAvatarDataUrl(file: File): Promise<string> {
  if (!file) throw new Error("missing_file");
  if (file.size > MAX_AVATAR_FILE_MB * 1024 * 1024) throw new Error("avatar_file_too_big");
  const bitmap = await bitmapFromFile(file);
  const fullDataUrl = sanitizeAvatarDataUrl(renderBitmapToDataUrl(bitmap, 320, 0.86), 280_000);
  try { (bitmap as any).close?.(); } catch {}
  if (!fullDataUrl) throw new Error("avatar_variant_too_large");
  return fullDataUrl;
}

export async function enforceSafeAvatarDataUrl(dataUrl: string): Promise<string | null> {
  const direct = sanitizeAvatarDataUrl(dataUrl);
  if (direct) return direct;
  return null;
}
