export const MAX_AVATAR_FILE_MB = 8;
export const MAX_AVATAR_DATA_URL_CHARS = 380_000;

function escapeAvatarSvgText(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char] || char));
}

function avatarSeedHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Avatar de secours déterministe : aucun profil sans photo ne doit produire
 * une icône d'image cassée. Le même profil garde toujours le même médaillon.
 */
export function makeAvatarPlaceholderDataUrl(name?: string | null, seed?: string | null): string {
  const safeName = String(name || "Joueur").trim() || "Joueur";
  const words = safeName.split(/\s+/).filter(Boolean);
  const initials = (words.length > 1 ? `${words[0][0] || ""}${words[words.length - 1][0] || ""}` : safeName.slice(0, 2)).toUpperCase();
  const hash = avatarSeedHash(String(seed || safeName));
  const hue = hash % 360;
  const hue2 = (hue + 38 + (hash % 47)) % 360;
  const label = escapeAvatarSvgText(initials || "MS");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="hsl(${hue} 62% 34%)"/><stop offset="1" stop-color="hsl(${hue2} 74% 17%)"/></linearGradient></defs><rect width="256" height="256" rx="128" fill="url(#g)"/><circle cx="128" cy="128" r="116" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="6"/><text x="128" y="147" text-anchor="middle" font-family="Arial,sans-serif" font-size="78" font-weight="800" fill="white">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

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
  return await imageFromDataUrl(dataUrl);
}

function imageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
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

async function recompressDataUrl(dataUrl: string, maxSide: number, quality: number): Promise<string | null> {
  const img = await imageFromDataUrl(dataUrl);
  const rendered = renderBitmapToDataUrl(img, maxSide, quality);
  return sanitizeAvatarDataUrl(rendered, MAX_AVATAR_DATA_URL_CHARS);
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
  // Cast et full utilisaient exactement le même rendu 320px mais étaient encodés
  // deux fois. On réutilise la même chaîne immuable : zéro canvas/base64 dupliqué.
  const castDataUrl = fullDataUrl;
  try { (bitmap as any).close?.(); } catch {}
  if (!thumbDataUrl || !fullDataUrl || !castDataUrl) throw new Error("avatar_variant_too_large");
  return { thumbDataUrl, fullDataUrl, castDataUrl };
}

export async function fileToSafeAvatarDataUrl(file: File): Promise<string> {
  if (!file) throw new Error("missing_file");
  if (file.size > MAX_AVATAR_FILE_MB * 1024 * 1024) throw new Error("avatar_file_too_big");
  const bitmap = await bitmapFromFile(file);
  const fullDataUrl = sanitizeAvatarDataUrl(renderBitmapToDataUrl(bitmap, 512, 0.82), MAX_AVATAR_DATA_URL_CHARS);
  try { (bitmap as any).close?.(); } catch {}
  if (!fullDataUrl) throw new Error("avatar_variant_too_large");
  return fullDataUrl;
}

export async function enforceSafeAvatarDataUrl(dataUrl: string): Promise<string | null> {
  const direct = sanitizeAvatarDataUrl(dataUrl);
  if (direct) return direct;
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) return null;
  try {
    return await recompressDataUrl(dataUrl, 512, 0.76);
  } catch {
    return null;
  }
}
