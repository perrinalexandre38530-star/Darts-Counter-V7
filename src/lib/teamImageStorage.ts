// =============================================================
// src/lib/teamImageStorage.ts
// Helpers anti-crash quota pour logos/couvertures d'équipes.
// Objectif: ne plus stocker les images originales énormes en base64.
// =============================================================

import { packJsonForStorage } from "./imageStorageCodec";
import { purgeLegacyLocalStorageIfNeeded } from "./storageQuota";

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

function packForLocalStorage(value: unknown): string {
  // Les équipes contiennent beaucoup de champs répétés (URLs, ids, sports, etc.).
  // Le codec LZ existant réduit fortement dc-teams-v1 sans changer le schéma métier.
  return packJsonForStorage(value ?? null, {
    compressAboveChars: 8_000,
    sanitizeImages: false,
  });
}

function tryQuotaSafeWrite(key: string, payload: string): boolean {
  try {
    localStorage.setItem(key, payload);
    return true;
  } catch (err) {
    if (!isStorageQuotaError(err)) throw err;
    return false;
  }
}

export function setJsonWithQuotaRecovery<T>(
  key: string,
  value: T,
  compact?: (v: T) => T
): void {
  if (typeof localStorage === "undefined") return;

  const first = packForLocalStorage(value);
  if (tryQuotaSafeWrite(key, first)) return;

  // 1) Retire les médias inline lourds via le compacteur fourni par le store.
  const compacted = compact ? compact(value) : value;
  const second = packForLocalStorage(compacted);
  if (tryQuotaSafeWrite(key, second)) return;

  // 2) Le quota peut être saturé par d'anciennes clés devenues inutiles.
  // La purge est volontairement ciblée et n'efface pas les données métier actives.
  try {
    purgeLegacyLocalStorageIfNeeded({ force: true });
  } catch {}
  if (tryQuotaSafeWrite(key, second)) return;

  // 3) Dernier recours : certains WebView/Chromium refusent le remplacement
  // d'une grosse valeur alors qu'une version compacte tiendrait une fois l'ancienne
  // libérée. On garde l'ancienne valeur et on tente un remplacement atomique manuel.
  let previous: string | null = null;
  try { previous = localStorage.getItem(key); } catch {}

  try {
    if (previous != null) localStorage.removeItem(key);
    if (tryQuotaSafeWrite(key, second)) return;
  } catch (err) {
    if (!isStorageQuotaError(err)) throw err;
  }

  // Si l'écriture compacte échoue encore, restaurer l'ancienne valeur si possible.
  if (previous != null) {
    try { localStorage.setItem(key, previous); } catch {}
  }

  // Surtout ne plus faire remonter QuotaExceededError jusqu'au CrashBoundary.
  // Les médias d'équipe sont déjà miroirés en R2 par les stores appelants.
  console.error(`[teamImageStorage] localStorage quota toujours saturé pour "${key}" après compression + purge.`);
  try {
    window.dispatchEvent(new CustomEvent("dc-storage-quota", { detail: { key } }));
  } catch {}
}
