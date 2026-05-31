// =============================================================
// src/lib/teamImageStorage.ts
// Helpers anti-crash quota pour logos/couvertures d'équipes.
// Objectif: ne plus stocker les images originales énormes en base64.
// =============================================================

const DATA_URL_RE = /^data:image\//i;
const MAX_STORED_IMAGE_CHARS = 260_000; // filet de sécurité localStorage (~190KB binaires)

export function isStorageQuotaError(err: unknown): boolean {
  const e: any = err;
  const name = String(e?.name || "");
  const msg = String(e?.message || e || "");
  return (
    name === "QuotaExceededError" ||
    name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    /quota|exceeded|storage/i.test(msg)
  );
}

export function sanitizeStoredImage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s || !DATA_URL_RE.test(s)) return null;
  // Si une vieille image énorme est déjà en storage, on ne la réécrit pas.
  if (s.length > MAX_STORED_IMAGE_CHARS) return null;
  return s;
}

function canvasToDataUrl(canvas: HTMLCanvasElement, type = "image/webp", quality = 0.78): string {
  try {
    const out = canvas.toDataURL(type, quality);
    if (out && DATA_URL_RE.test(out)) return out;
  } catch {
    // Safari / vieux navigateurs: fallback PNG plus bas.
  }
  return canvas.toDataURL("image/png");
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load error"));
    };
    img.src = url;
  });
}

export async function fileToCompressedImageDataUrl(
  file: File,
  opts?: { maxSize?: number; quality?: number }
): Promise<string> {
  const maxSize = Math.max(96, opts?.maxSize ?? 256);
  const quality = Math.min(0.92, Math.max(0.45, opts?.quality ?? 0.78));

  if (!file.type || !file.type.startsWith("image/")) {
    throw new Error("Le fichier sélectionné n’est pas une image.");
  }

  const img = await loadImageFromFile(file);
  const sourceW = Math.max(1, img.naturalWidth || img.width || 1);
  const sourceH = Math.max(1, img.naturalHeight || img.height || 1);
  const scale = Math.min(1, maxSize / Math.max(sourceW, sourceH));
  const w = Math.max(1, Math.round(sourceW * scale));
  const h = Math.max(1, Math.round(sourceH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);

  let dataUrl = canvasToDataUrl(canvas, "image/webp", quality);

  // Dernière réduction si l'image reste trop grosse pour le storage.
  if (dataUrl.length > MAX_STORED_IMAGE_CHARS && maxSize > 128) {
    return fileToCompressedImageDataUrl(file, { maxSize: 128, quality: 0.68 });
  }

  return dataUrl;
}

export function setJsonWithQuotaRecovery<T>(
  key: string,
  value: T,
  compact?: (v: T) => T
): void {
  const first = JSON.stringify(value ?? null);
  try {
    localStorage.setItem(key, first);
    return;
  } catch (err) {
    if (!isStorageQuotaError(err) || !compact) throw err;
  }

  const compacted = compact(value);
  localStorage.setItem(key, JSON.stringify(compacted ?? null));
}
