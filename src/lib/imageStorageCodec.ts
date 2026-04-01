import LZString from "lz-string";
import { sanitizeAvatarDataUrl, MAX_AVATAR_DATA_URL_CHARS } from "./avatarSafe";

export const IMAGE_STORAGE_CODEC_VERSION = 1;
const IMAGE_STORAGE_MARKER = "__dc_img_lz_v1__";
const DEFAULT_IMAGE_MAX_CHARS = 380_000;

type ImageStorageEnvelope = {
  [IMAGE_STORAGE_MARKER]: 1;
  v: number;
  data: string;
};

type LocalStorageJsonOptions = {
  compressAboveChars?: number;
  imageMaxChars?: number;
  sanitizeImages?: boolean;
};

function isObjectLike(value: any): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isDataImageUrl(value: any): value is string {
  return typeof value === "string" && value.startsWith("data:image/");
}

function looksLikeImageFieldName(key: string): boolean {
  const k = String(key || "").toLowerCase();
  return (
    k.includes("avatar") ||
    k.includes("photo") ||
    k.includes("image") ||
    k.includes("thumb") ||
    k.includes("icon") ||
    k.includes("logo")
  );
}

function sanitizeImageString(value: string, key?: string, maxChars = DEFAULT_IMAGE_MAX_CHARS): string {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (!isDataImageUrl(trimmed)) return trimmed;

  if (looksLikeImageFieldName(String(key || "")) && String(key || "").toLowerCase().includes("avatar")) {
    return sanitizeAvatarDataUrl(trimmed, Math.min(maxChars, MAX_AVATAR_DATA_URL_CHARS)) || "";
  }

  return trimmed.length <= maxChars ? trimmed : "";
}

export function sanitizeImagesDeep<T>(input: T, options?: { imageMaxChars?: number }): T {
  const imageMaxChars = options?.imageMaxChars ?? DEFAULT_IMAGE_MAX_CHARS;

  const walk = (value: any, pathKey?: string): any => {
    if (typeof value === "string") {
      return sanitizeImageString(value, pathKey, imageMaxChars);
    }

    if (Array.isArray(value)) {
      return value.map((item) => walk(item, pathKey));
    }

    if (!isObjectLike(value)) return value;

    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      const next = walk(v, k);
      if (typeof next === "string" && isDataImageUrl(v) && !next) {
        if (k === "thumbImageUrl" || k === "avatarDataUrl" || k === "photoDataUrl") {
          out[k] = undefined;
          continue;
        }
        if (k === "mainImageUrl") {
          out[k] = "";
          continue;
        }
      }
      out[k] = next;
    }
    return out;
  };

  return walk(input) as T;
}

export function packJsonForStorage(value: any, options?: LocalStorageJsonOptions): string {
  const compressAboveChars = options?.compressAboveChars ?? 20_000;
  const sanitizeImages = options?.sanitizeImages !== false;

  const prepared = sanitizeImages ? sanitizeImagesDeep(value, { imageMaxChars: options?.imageMaxChars }) : value;
  const json = JSON.stringify(prepared);

  const shouldCompress = json.length >= compressAboveChars || json.includes("data:image/");
  if (!shouldCompress) return json;

  const compressed = LZString.compressToUTF16(json);
  const envelope: ImageStorageEnvelope = {
    [IMAGE_STORAGE_MARKER]: 1,
    v: IMAGE_STORAGE_CODEC_VERSION,
    data: compressed,
  };
  return JSON.stringify(envelope);
}

export function unpackJsonFromStorage<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && (parsed as any)[IMAGE_STORAGE_MARKER] === 1 && typeof (parsed as any).data === "string") {
      const json = LZString.decompressFromUTF16((parsed as any).data);
      if (!json) return fallback;
      return JSON.parse(json) as T;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function safeLocalStorageSetJson(
  key: string,
  value: any,
  options?: LocalStorageJsonOptions
): boolean {
  try {
    const packed = packJsonForStorage(value, options);
    localStorage.setItem(key, packed);
    return true;
  } catch (err) {
    console.warn("[imageStorageCodec] set failed", key, err);
    return false;
  }
}

export function safeLocalStorageGetJson<T>(
  key: string,
  fallback: T
): T {
  try {
    const raw = localStorage.getItem(key);
    return unpackJsonFromStorage<T>(raw, fallback);
  } catch {
    return fallback;
  }
}
