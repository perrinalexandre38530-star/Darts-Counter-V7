import { sanitizeAvatarDataUrl } from "./avatarSafe";
import { safeLocalStorageGetJson, safeLocalStorageSetJson } from "./imageStorageCodec";

const KEY = "dc_avatar_cache_v1";
const FAST_KEY_PREFIX = "dc_avatar_fast_v2:";
const FAST_THUMB_MAX_CHARS = 72_000;
const MAX_CACHE_ENTRIES = 120;

export type AvatarCacheEntry = {
  profileId: string;
  avatarDataUrl?: string | null;
  avatarThumbDataUrl?: string | null;
  avatarFullDataUrl?: string | null;
  avatarCastDataUrl?: string | null;
  avatarUrl?: string | null;
  avatarUpdatedAt?: number;
  avatarAssetId?: string | null;
  avatarThumbAssetId?: string | null;
  avatarFullAssetId?: string | null;
  avatarCastAssetId?: string | null;
};

function sanitizeEntry(entry: AvatarCacheEntry | null | undefined): AvatarCacheEntry | null {
  if (!entry?.profileId) return null;
  const avatarDataUrl = sanitizeAvatarDataUrl(entry.avatarDataUrl ?? null, 380_000);
  const avatarThumbDataUrl = sanitizeAvatarDataUrl(entry.avatarThumbDataUrl ?? entry.avatarDataUrl ?? null, 140_000);
  const avatarFullDataUrl = sanitizeAvatarDataUrl(entry.avatarFullDataUrl ?? entry.avatarDataUrl ?? null, 280_000);
  const avatarCastDataUrl = sanitizeAvatarDataUrl(entry.avatarCastDataUrl ?? entry.avatarFullDataUrl ?? entry.avatarDataUrl ?? null, 380_000);
  const avatarUrl =
    typeof entry.avatarUrl === "string" && !entry.avatarUrl.startsWith("data:image/")
      ? entry.avatarUrl
      : undefined;

  return {
    profileId: String(entry.profileId),
    avatarDataUrl: avatarDataUrl || null,
    avatarThumbDataUrl: avatarThumbDataUrl || null,
    avatarFullDataUrl: avatarFullDataUrl || null,
    avatarCastDataUrl: avatarCastDataUrl || null,
    avatarUrl,
    avatarUpdatedAt: Number(entry.avatarUpdatedAt || Date.now()),
    avatarAssetId: typeof entry.avatarAssetId === "string" ? entry.avatarAssetId : null,
    avatarThumbAssetId: typeof entry.avatarThumbAssetId === "string" ? entry.avatarThumbAssetId : null,
    avatarFullAssetId: typeof entry.avatarFullAssetId === "string" ? entry.avatarFullAssetId : null,
    avatarCastAssetId: typeof entry.avatarCastAssetId === "string" ? entry.avatarCastAssetId : null,
  };
}

function fastKey(profileId: string): string {
  return `${FAST_KEY_PREFIX}${String(profileId || "").trim()}`;
}

function toFastEntry(entry: AvatarCacheEntry | null | undefined): AvatarCacheEntry | null {
  if (!entry?.profileId) return null;
  const thumbRaw = typeof entry.avatarThumbDataUrl === "string"
    ? entry.avatarThumbDataUrl
    : typeof entry.avatarDataUrl === "string"
    ? entry.avatarDataUrl
    : "";
  const thumb = thumbRaw.startsWith("data:image/") && thumbRaw.length <= FAST_THUMB_MAX_CHARS
    ? sanitizeAvatarDataUrl(thumbRaw, FAST_THUMB_MAX_CHARS)
    : null;
  return {
    profileId: String(entry.profileId),
    avatarThumbDataUrl: thumb || null,
    avatarUrl: typeof entry.avatarUrl === "string" && !entry.avatarUrl.startsWith("data:image/") ? entry.avatarUrl : null,
    avatarUpdatedAt: Number(entry.avatarUpdatedAt || Date.now()),
    avatarAssetId: typeof entry.avatarAssetId === "string" ? entry.avatarAssetId : null,
    avatarThumbAssetId: typeof entry.avatarThumbAssetId === "string" ? entry.avatarThumbAssetId : null,
    avatarFullAssetId: typeof entry.avatarFullAssetId === "string" ? entry.avatarFullAssetId : null,
    avatarCastAssetId: typeof entry.avatarCastAssetId === "string" ? entry.avatarCastAssetId : null,
  };
}

function writeFastEntry(entry: AvatarCacheEntry | null | undefined): void {
  try {
    if (typeof localStorage === "undefined") return;
    const fast = toFastEntry(entry);
    if (!fast) return;
    localStorage.setItem(fastKey(fast.profileId), JSON.stringify(fast));
  } catch {}
}

/**
 * Lecture spéciale premier paint : ne décompresse jamais le gros cache global.
 * Le cache complet legacy peut contenir plusieurs Mo d'images LZ et bloquer Chrome Android.
 */
export function getAvatarCacheFast(profileId: string): AvatarCacheEntry | null {
  const pid = String(profileId || "").trim();
  if (!pid) return null;
  try {
    if (memoryCache?.[pid]) return toFastEntry(memoryCache[pid]);
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(fastKey(pid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return toFastEntry(parsed as AvatarCacheEntry);
  } catch {
    return null;
  }
}

let memoryCache: Record<string, AvatarCacheEntry> | null = null;
let writeTimer: number | null = null;

function loadAllFromStorage(): Record<string, AvatarCacheEntry> {
  const raw = safeLocalStorageGetJson<Record<string, AvatarCacheEntry>>(KEY, {});
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, AvatarCacheEntry> = {};
  for (const [profileId, entry] of Object.entries(raw)) {
    const safe = sanitizeEntry(entry as AvatarCacheEntry);
    if (safe) out[profileId] = safe;
  }
  return out;
}

function readAll(): Record<string, AvatarCacheEntry> {
  if (memoryCache) return memoryCache;
  memoryCache = loadAllFromStorage();
  return memoryCache;
}

function flushAvatarCacheSoon() {
  if (typeof window === "undefined") return;
  if (writeTimer != null) {
    window.clearTimeout(writeTimer);
  }

  // Écriture différée : la compression LZ + JSON.stringify de toutes les images
  // peut bloquer l'UI sur mobile/Chrome quand on modifie un profil.
  writeTimer = window.setTimeout(() => {
    writeTimer = null;
    try {
      const all = memoryCache || {};
      const trimmed = Object.values(all)
        .sort((a, b) => Number(b.avatarUpdatedAt || 0) - Number(a.avatarUpdatedAt || 0))
        .slice(0, MAX_CACHE_ENTRIES);

      const next = Object.fromEntries(trimmed.map((item) => [item.profileId, item]));
      memoryCache = next;
      safeLocalStorageSetJson(KEY, next, {
        sanitizeImages: true,
        imageMaxChars: 280_000,
        compressAboveChars: 50_000,
      });
    } catch {}
  }, 900);
}

export function getAvatarCache(profileId: string): AvatarCacheEntry | null {
  try {
    const all = readAll();
    return all[profileId] || null;
  } catch {
    return null;
  }
}

export function setAvatarCache(entry: AvatarCacheEntry) {
  try {
    const safe = sanitizeEntry(entry);
    if (!safe) return;

    // Petit miroir par profil écrit immédiatement : affichage avatar sans
    // décompression du cache global au montage des pages.
    writeFastEntry(safe);

    const all = readAll();
    all[safe.profileId] = safe;
    memoryCache = all;

    flushAvatarCacheSoon();
  } catch {}
}
