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

type StorageFailureState = {
  count: number;
  firstAt: number;
  blockedUntil: number;
  lastWarnAt: number;
};

const storageFailureState = new Map<string, StorageFailureState>();
const STORAGE_FAILURE_WINDOW_MS = 2_500;
const STORAGE_QUOTA_COOLDOWN_MS = 120_000;
const STORAGE_WARN_COOLDOWN_MS = 30_000;

function isQuotaExceededError(err: any): boolean {
  const name = String(err?.name || "");
  const code = Number(err?.code || 0);
  return name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED" || code === 22 || code === 1014;
}

function localStorageWriteBlocked(key: string): boolean {
  const state = storageFailureState.get(key);
  if (!state?.blockedUntil) return false;
  if (Date.now() >= state.blockedUntil) {
    storageFailureState.delete(key);
    return false;
  }
  return true;
}

function noteLocalStorageFailure(key: string, err: any) {
  const now = Date.now();
  const previous = storageFailureState.get(key);
  const sameBurst = previous && now - previous.firstAt <= STORAGE_FAILURE_WINDOW_MS;
  const count = sameBurst ? previous!.count + 1 : 1;
  const quotaExceeded = isQuotaExceededError(err);
  // Quota plein = échec déterministe : ne pas répéter trois fois les coûteux
  // sanitize -> stringify -> LZString -> setItem sur le thread principal.
  const blockedUntil = quotaExceeded ? now + STORAGE_QUOTA_COOLDOWN_MS : 0;
  const lastWarnAt = previous?.lastWarnAt || 0;
  storageFailureState.set(key, { count, firstAt: sameBurst ? previous!.firstAt : now, blockedUntil, lastWarnAt: now });
  const debugQuota = typeof window !== "undefined" && (window as any).__STORAGE_QUOTA_DEBUG === true;
  if ((!quotaExceeded || debugQuota) && now - lastWarnAt >= STORAGE_WARN_COOLDOWN_MS) {
    console.warn("[imageStorageCodec] set failed", key, err);
    if (blockedUntil) console.warn("[imageStorageCodec] write circuit open", key, `${STORAGE_QUOTA_COOLDOWN_MS / 1000}s`);
  }
}

function clearLocalStorageFailure(key: string) {
  storageFailureState.delete(key);
}

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
  const seen = new WeakSet<object>();

  const walk = (value: any, pathKey?: string): any => {
    if (typeof value === "string") {
      return sanitizeImageString(value, pathKey, imageMaxChars);
    }

    if (value && typeof value === "object") {
      if (seen.has(value)) return undefined;
      seen.add(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => walk(item, pathKey)).filter((item) => item !== undefined);
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
  // Après trois QuotaExceeded consécutifs sur la même clé, ne plus refaire
  // pendant 2 minutes les coûteux sanitize -> JSON.stringify -> LZ -> setItem.
  // C'était visible dans DevTools sur dc_dart_sets_v1 et pouvait rendre toute
  // l'application molle alors que l'écriture était condamnée à échouer.
  if (localStorageWriteBlocked(key)) return false;
  try {
    const packed = packJsonForStorage(value, options);
    localStorage.setItem(key, packed);
    clearLocalStorageFailure(key);
    return true;
  } catch (err) {
    noteLocalStorageFailure(key, err);
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
