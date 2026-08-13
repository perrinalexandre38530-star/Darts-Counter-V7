import { sanitizeAvatarDataUrl } from "./avatarSafe";
import { safeLocalStorageSetJson, unpackJsonFromStorage } from "./imageStorageCodec";

const KEY = "dc_avatar_cache_v1";
const FAST_KEY_PREFIX = "dc_avatar_fast_v2:";

// Le cache localStorage doit rester un cache d'affichage, jamais un coffre média.
// Les pixels complets sont déjà sécurisés dans userMediaFallback (IndexedDB/R2).
const FAST_THUMB_MAX_CHARS = 64_000;
const FAST_STORAGE_MAX_CHARS = 800_000;
const FAST_STORAGE_MAX_ENTRIES = 40;
const GLOBAL_CACHE_MAX_ENTRIES = 220; // métadonnées seulement
const LEGACY_GLOBAL_RAW_MAX_CHARS = 160_000;
const SESSION_THUMB_MAX_CHARS = 140_000;
const SESSION_THUMB_BUDGET_CHARS = 2_000_000;

export type AvatarCacheEntry = {
  profileId: string;
  avatarDataUrl?: string | null;
  avatarThumbDataUrl?: string | null;
  avatarFullDataUrl?: string | null;
  avatarCastDataUrl?: string | null;
  avatarUrl?: string | null;
  avatarPath?: string | null;
  avatarUpdatedAt?: number;
  avatarAssetId?: string | null;
  avatarThumbAssetId?: string | null;
  avatarFullAssetId?: string | null;
  avatarCastAssetId?: string | null;
};

type FastStoredEntry = AvatarCacheEntry & { _cacheAt?: number };

let memoryCache: Record<string, AvatarCacheEntry> | null = null; // métadonnées uniquement
let writeTimer: number | null = null;
let fastPruneTimer: number | null = null;

// Petit cache de session pour que l'avatar tout juste modifié reste disponible
// immédiatement sans recopier des dizaines de data URLs dans localStorage.
const sessionThumbs = new Map<string, string>();
let sessionThumbChars = 0;

function rememberSessionThumb(profileId: string, dataUrl: string | null | undefined): void {
  const pid = String(profileId || "").trim();
  const safe = sanitizeAvatarDataUrl(dataUrl ?? null, SESSION_THUMB_MAX_CHARS);
  const previous = sessionThumbs.get(pid);
  if (previous) {
    sessionThumbs.delete(pid);
    sessionThumbChars = Math.max(0, sessionThumbChars - previous.length);
  }
  if (!pid || !safe) return;
  sessionThumbs.set(pid, safe);
  sessionThumbChars += safe.length;
  while (sessionThumbChars > SESSION_THUMB_BUDGET_CHARS && sessionThumbs.size > 1) {
    const oldest = sessionThumbs.keys().next().value as string | undefined;
    if (!oldest) break;
    const value = sessionThumbs.get(oldest) || "";
    sessionThumbs.delete(oldest);
    sessionThumbChars = Math.max(0, sessionThumbChars - value.length);
  }
}

function pickThumb(entry: AvatarCacheEntry | null | undefined, maxChars = SESSION_THUMB_MAX_CHARS): string | null {
  if (!entry) return null;
  return (
    sanitizeAvatarDataUrl(entry.avatarThumbDataUrl ?? null, maxChars) ||
    sanitizeAvatarDataUrl(entry.avatarDataUrl ?? null, maxChars) ||
    sanitizeAvatarDataUrl(entry.avatarFullDataUrl ?? null, maxChars) ||
    sanitizeAvatarDataUrl(entry.avatarCastDataUrl ?? null, maxChars) ||
    null
  );
}

function metadataOnly(entry: AvatarCacheEntry | null | undefined): AvatarCacheEntry | null {
  if (!entry?.profileId) return null;
  const avatarUrl =
    typeof entry.avatarUrl === "string" && entry.avatarUrl.trim() && !entry.avatarUrl.startsWith("data:image/")
      ? entry.avatarUrl.trim()
      : null;
  const avatarPath =
    typeof entry.avatarPath === "string" && entry.avatarPath.trim() && !entry.avatarPath.startsWith("data:image/")
      ? entry.avatarPath.trim()
      : null;

  return {
    profileId: String(entry.profileId),
    avatarUrl,
    avatarPath,
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

function toFastEntry(entry: AvatarCacheEntry | null | undefined): FastStoredEntry | null {
  if (!entry?.profileId) return null;
  const thumb = pickThumb(entry, FAST_THUMB_MAX_CHARS);
  const meta = metadataOnly(entry);
  if (!meta) return null;
  return {
    ...meta,
    avatarThumbDataUrl: thumb || null,
    // Une seule copie de la data URL est sérialisée. avatarDataUrl est recréé à la lecture.
    avatarDataUrl: null,
    avatarFullDataUrl: null,
    avatarCastDataUrl: null,
    _cacheAt: Date.now(),
  };
}

function parseFastRaw(raw: string | null): FastStoredEntry | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FastStoredEntry;
    if (!parsed?.profileId) return null;
    const meta = metadataOnly(parsed);
    if (!meta) return null;
    const thumb = sanitizeAvatarDataUrl(parsed.avatarThumbDataUrl ?? parsed.avatarDataUrl ?? null, FAST_THUMB_MAX_CHARS);
    return {
      ...meta,
      profileId: String(parsed.profileId),
      avatarThumbDataUrl: thumb || null,
      _cacheAt: Number(parsed._cacheAt || parsed.avatarUpdatedAt || 0),
    } as FastStoredEntry;
  } catch {
    return null;
  }
}

function pruneFastStorage(): void {
  try {
    if (typeof localStorage === "undefined") return;
    const rows: Array<{ key: string; rawChars: number; at: number }> = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i) || "";
      if (!key.startsWith(FAST_KEY_PREFIX)) continue;
      const raw = localStorage.getItem(key) || "";
      const parsed = parseFastRaw(raw);
      if (!parsed || raw.length > FAST_THUMB_MAX_CHARS + 16_000) {
        localStorage.removeItem(key);
        i -= 1;
        continue;
      }
      rows.push({ key, rawChars: raw.length, at: Number(parsed._cacheAt || parsed.avatarUpdatedAt || 0) });
    }

    rows.sort((a, b) => b.at - a.at);
    let keptChars = 0;
    let kept = 0;
    for (const row of rows) {
      const mayKeep = kept < FAST_STORAGE_MAX_ENTRIES && keptChars + row.rawChars <= FAST_STORAGE_MAX_CHARS;
      if (mayKeep) {
        kept += 1;
        keptChars += row.rawChars;
      } else {
        localStorage.removeItem(row.key);
      }
    }
  } catch {}
}

function scheduleFastPrune(): void {
  if (typeof window === "undefined" || fastPruneTimer != null) return;
  fastPruneTimer = window.setTimeout(() => {
    fastPruneTimer = null;
    pruneFastStorage();
  }, 250);
}

function writeFastEntry(entry: AvatarCacheEntry | null | undefined): void {
  try {
    if (typeof localStorage === "undefined") return;
    const fast = toFastEntry(entry);
    if (!fast) return;
    const raw = JSON.stringify(fast);
    try {
      localStorage.setItem(fastKey(fast.profileId), raw);
    } catch {
      // Quota déjà saturé par une ancienne version : libère d'abord les anciens caches.
      try { localStorage.removeItem(KEY); } catch {}
      pruneFastStorage();
      try { localStorage.setItem(fastKey(fast.profileId), raw); } catch {}
    }
    scheduleFastPrune();
  } catch {}
}

/**
 * Lecture spéciale premier paint : ne décompresse jamais le gros cache global.
 */
export function getAvatarCacheFast(profileId: string): AvatarCacheEntry | null {
  const pid = String(profileId || "").trim();
  if (!pid) return null;
  try {
    const session = sessionThumbs.get(pid) || null;
    if (session) {
      const meta = memoryCache?.[pid] || null;
      return {
        ...(meta || { profileId: pid }),
        profileId: pid,
        avatarThumbDataUrl: session,
        avatarDataUrl: session,
      };
    }
    if (typeof localStorage === "undefined") return memoryCache?.[pid] || null;
    const parsed = parseFastRaw(localStorage.getItem(fastKey(pid)));
    if (!parsed) return memoryCache?.[pid] || null;
    const thumb = parsed.avatarThumbDataUrl || null;
    return {
      ...(memoryCache?.[pid] || {}),
      ...parsed,
      profileId: pid,
      avatarThumbDataUrl: thumb,
      avatarDataUrl: thumb,
      avatarFullDataUrl: null,
      avatarCastDataUrl: null,
    };
  } catch {
    return memoryCache?.[pid] || null;
  }
}

function loadAllFromStorage(): Record<string, AvatarCacheEntry> {
  try {
    if (typeof localStorage === "undefined") return {};
    const packed = localStorage.getItem(KEY);
    if (!packed) return {};

    // Une ancienne version pouvait sérialiser 4 variantes base64 par profil.
    // Au-delà de ce seuil on ne décompresse pas ce bloc potentiellement énorme :
    // les fast thumbs + IndexedDB/R2 sont désormais les sources de secours.
    if (packed.length > LEGACY_GLOBAL_RAW_MAX_CHARS) {
      localStorage.removeItem(KEY);
      return {};
    }

    const raw = unpackJsonFromStorage<Record<string, AvatarCacheEntry>>(packed, {});
    if (!raw || typeof raw !== "object") return {};
    const out: Record<string, AvatarCacheEntry> = {};
    for (const [profileId, entry] of Object.entries(raw)) {
      const normalized = { ...(entry as AvatarCacheEntry), profileId: String((entry as any)?.profileId || profileId) };
      const thumb = pickThumb(normalized, FAST_THUMB_MAX_CHARS);
      if (thumb) writeFastEntry({ ...normalized, avatarThumbDataUrl: thumb });
      const meta = metadataOnly(normalized);
      if (meta) out[meta.profileId] = meta;
    }
    return out;
  } catch {
    return {};
  }
}

function readAll(): Record<string, AvatarCacheEntry> {
  if (memoryCache) return memoryCache;
  memoryCache = loadAllFromStorage();
  return memoryCache;
}

function flushAvatarCacheSoon() {
  if (typeof window === "undefined") return;
  if (writeTimer != null) window.clearTimeout(writeTimer);

  writeTimer = window.setTimeout(() => {
    writeTimer = null;
    try {
      const all = memoryCache || {};
      const trimmed = Object.values(all)
        .map(metadataOnly)
        .filter(Boolean) as AvatarCacheEntry[];
      trimmed.sort((a, b) => Number(b.avatarUpdatedAt || 0) - Number(a.avatarUpdatedAt || 0));
      const next = Object.fromEntries(trimmed.slice(0, GLOBAL_CACHE_MAX_ENTRIES).map((item) => [item.profileId, item]));
      memoryCache = next;

      if (!safeLocalStorageSetJson(KEY, next, { sanitizeImages: false, compressAboveChars: 50_000 })) {
        // Remplacement atomique impossible parce que l'ancien quota est plein.
        try { localStorage.removeItem(KEY); } catch {}
        safeLocalStorageSetJson(KEY, next, { sanitizeImages: false, compressAboveChars: 50_000 });
      }
      pruneFastStorage();
    } catch {}
  }, 700);
}

export function getAvatarCache(profileId: string): AvatarCacheEntry | null {
  const pid = String(profileId || "").trim();
  if (!pid) return null;
  try {
    const all = readAll();
    const meta = all[pid] || null;
    const fast = getAvatarCacheFast(pid);
    if (!meta && !fast) return null;
    const thumb = fast?.avatarThumbDataUrl || fast?.avatarDataUrl || null;
    return {
      ...(meta || { profileId: pid }),
      ...(fast || {}),
      profileId: pid,
      avatarThumbDataUrl: thumb,
      avatarDataUrl: thumb,
      avatarFullDataUrl: null,
      avatarCastDataUrl: null,
    };
  } catch {
    return null;
  }
}

export function setAvatarCache(entry: AvatarCacheEntry) {
  try {
    const pid = String(entry?.profileId || "").trim();
    if (!pid) return;

    const thumb = pickThumb(entry, SESSION_THUMB_MAX_CHARS);
    // Appelé même avec null afin qu'un avatar explicitement supprimé / remplacé
    // par une URL distante ne reste pas accroché dans le cache de session.
    rememberSessionThumb(pid, thumb);
    writeFastEntry({ ...entry, profileId: pid, avatarThumbDataUrl: thumb });

    const all = readAll();
    const previous = all[pid] || null;
    const nextMeta = metadataOnly({ ...(previous || {}), ...(entry || {}), profileId: pid });
    if (!nextMeta) return;
    all[pid] = nextMeta;
    memoryCache = all;
    flushAvatarCacheSoon();
  } catch {}
}

export function getAvatarCacheDiagnostics() {
  let fastEntries = 0;
  let fastChars = 0;
  try {
    if (typeof localStorage !== "undefined") {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i) || "";
        if (!key.startsWith(FAST_KEY_PREFIX)) continue;
        fastEntries += 1;
        fastChars += (localStorage.getItem(key) || "").length;
      }
    }
  } catch {}
  return {
    metadataEntries: Object.keys(memoryCache || {}).length,
    sessionThumbEntries: sessionThumbs.size,
    sessionThumbChars,
    fastEntries,
    fastChars,
  };
}

try {
  (globalThis as any).__dcAvatarCacheDiagnostics = getAvatarCacheDiagnostics;
} catch {}
