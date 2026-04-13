
// ============================================
// src/lib/avatarSafe.ts
// Sécurisation import / affichage avatars
// ============================================

export const MAX_AVATAR_FILE_MB = 6;
export const MAX_AVATAR_DATA_URL_CHARS = 180_000;

export function sanitizeAvatarDataUrl(input: any, maxChars = MAX_AVATAR_DATA_URL_CHARS): string | null {
  try {
    if (typeof input !== "string") return null;
    const s = input.trim();
    if (!s) return null;
    if (!s.startsWith("data:image/")) return null;
    if (s.length > maxChars) return null;
    return s;
  } catch {
    return null;
  }
}

async function imageFileToDataUrl(file: File): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("read_failed"));
    r.onload = () => resolve(String(r.result || ""));
    r.readAsDataURL(file);
  });
}

async function drawResizedDataUrl(dataUrl: string, maxSize: number, quality: number): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth || img.width || 1;
          const h = img.naturalHeight || img.height || 1;
          const scale = Math.min(1, maxSize / Math.max(w, h));
          const tw = Math.max(1, Math.round(w * scale));
          const th = Math.max(1, Math.round(h * scale));

          const canvas = document.createElement("canvas");
          canvas.width = tw;
          canvas.height = th;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("canvas_unavailable"));
            return;
          }
          ctx.drawImage(img, 0, 0, tw, th);
          resolve(canvas.toDataURL("image/webp", quality));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error("image_load_failed"));
      img.src = dataUrl;
    } catch (e) {
      reject(e);
    }
  });
}

export async function fileToSafeAvatarDataUrl(file: File): Promise<string> {
  const variants = await fileToAvatarVariants(file);
  return variants.fullDataUrl;
}

export async function enforceSafeAvatarDataUrl(dataUrl: string): Promise<string | null> {
  const already = sanitizeAvatarDataUrl(dataUrl);
  if (already) return already;
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) return null;

  const attempts: Array<{ max: number; quality: number }> = [
    { max: 160, quality: 0.78 },
    { max: 128, quality: 0.76 },
    { max: 112, quality: 0.74 },
    { max: 96, quality: 0.72 },
    { max: 80, quality: 0.7 },
  ];

  for (const a of attempts) {
    try {
      const out = await drawResizedDataUrl(dataUrl, a.max, a.quality);
      const safe = sanitizeAvatarDataUrl(out);
      if (safe) return safe;
    } catch {}
  }
  return null;
}


export type AvatarVariants = {
  thumbDataUrl: string;
  fullDataUrl: string;
  castDataUrl: string;
};

export async function fileToAvatarVariants(file: File): Promise<AvatarVariants> {
  if (!file) throw new Error("missing_file");
  if (file.size > MAX_AVATAR_FILE_MB * 1024 * 1024) {
    throw new Error("avatar_file_too_big");
  }

  const raw = await imageFileToDataUrl(file);
  const thumb = await drawResizedDataUrl(raw, 128, 0.76);
  const full = await drawResizedDataUrl(raw, 320, 0.84);
  const cast = await drawResizedDataUrl(raw, 512, 0.88);

  const thumbSafe = sanitizeAvatarDataUrl(thumb, 120_000);
  const fullSafe = sanitizeAvatarDataUrl(full, 260_000) || sanitizeAvatarDataUrl(thumb, 120_000);
  const castSafe = sanitizeAvatarDataUrl(cast, 380_000) || fullSafe || thumbSafe;

  if (!thumbSafe || !fullSafe || !castSafe) throw new Error("avatar_dataurl_too_large");

  return {
    thumbDataUrl: thumbSafe,
    fullDataUrl: fullSafe,
    castDataUrl: castSafe,
  };
}
