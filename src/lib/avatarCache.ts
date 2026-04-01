import { sanitizeAvatarDataUrl } from "./avatarSafe";
import { safeLocalStorageGetJson, safeLocalStorageSetJson } from "./imageStorageCodec";

const KEY = "dc_avatar_cache_v1";
const MAX_CACHE_ENTRIES = 80;

type AvatarCacheEntry = {
  profileId: string;
  avatarDataUrl?: string | null;
  avatarUrl?: string | null;
  avatarUpdatedAt?: number;
};

function sanitizeEntry(entry: AvatarCacheEntry | null | undefined): AvatarCacheEntry | null {
  if (!entry?.profileId) return null;
  const avatarDataUrl = sanitizeAvatarDataUrl(entry.avatarDataUrl ?? null, 380_000);
  const avatarUrl =
    typeof entry.avatarUrl === "string" && !entry.avatarUrl.startsWith("data:image/")
      ? entry.avatarUrl
      : undefined;

  return {
    profileId: String(entry.profileId),
    avatarDataUrl: avatarDataUrl || null,
    avatarUrl,
    avatarUpdatedAt: Number(entry.avatarUpdatedAt || Date.now()),
  };
}

function readAll(): Record<string, AvatarCacheEntry> {
  const raw = safeLocalStorageGetJson<Record<string, AvatarCacheEntry>>(KEY, {});
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, AvatarCacheEntry> = {};
  for (const [profileId, entry] of Object.entries(raw)) {
    const safe = sanitizeEntry(entry as AvatarCacheEntry);
    if (safe) out[profileId] = safe;
  }
  return out;
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

    const all = readAll();
    all[safe.profileId] = safe;

    const trimmed = Object.values(all)
      .sort((a, b) => Number(b.avatarUpdatedAt || 0) - Number(a.avatarUpdatedAt || 0))
      .slice(0, MAX_CACHE_ENTRIES);

    const next = Object.fromEntries(trimmed.map((item) => [item.profileId, item]));
    safeLocalStorageSetJson(KEY, next, {
      sanitizeImages: true,
      imageMaxChars: 380_000,
      compressAboveChars: 8_000,
    });
  } catch {}
}
