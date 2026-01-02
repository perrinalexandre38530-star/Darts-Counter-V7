const KEY = "dc_avatar_cache_v1";

type AvatarCacheEntry = {
  profileId: string;
  avatarDataUrl?: string | null;
  avatarUrl?: string | null;
  avatarUpdatedAt?: number;
};

export function getAvatarCache(profileId: string): AvatarCacheEntry | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const all = JSON.parse(raw);
    return all[profileId] || null;
  } catch {
    return null;
  }
}

export function setAvatarCache(entry: AvatarCacheEntry) {
  try {
    const raw = localStorage.getItem(KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[entry.profileId] = entry;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}
