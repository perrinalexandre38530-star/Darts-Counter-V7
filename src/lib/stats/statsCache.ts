// ============================================
// src/lib/stats/statsCache.ts
// Cache stats local ultra-rapide (IndexedDB / mémoire)
// Utilisé par rebuildStats.ts + StatsHub
// ============================================

type CacheMap = Record<string, any>;

const CACHE_PREFIX = "dc-stats-cache-v1:";
const memCache: CacheMap = {};

/* --------------------------------------------
   Helpers
-------------------------------------------- */
function key(profileId: string) {
  return `${CACHE_PREFIX}${profileId}`;
}

/* --------------------------------------------
   API
-------------------------------------------- */

/** Charge le cache stats (mémoire → localStorage fallback) */
export async function loadStatsCache(profileId: string): Promise<any | null> {
  const k = key(profileId);

  if (memCache[k]) return memCache[k];

  try {
    const raw = localStorage.getItem(k);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    memCache[k] = parsed;
    return parsed;
  } catch {
    return null;
  }
}

/** Sauvegarde le cache stats */
export async function saveStatsCache(profileId: string, data: any): Promise<void> {
  const k = key(profileId);
  memCache[k] = data;

  try {
    localStorage.setItem(k, JSON.stringify(data));
  } catch (e) {
    console.warn("[statsCache] localStorage full?", e);
  }
}

/** Supprime le cache stats d’un profil */
export async function clearStatsCache(profileId: string): Promise<void> {
  const k = key(profileId);
  delete memCache[k];

  try {
    localStorage.removeItem(k);
  } catch {}
}

/** Clear TOTAL (debug / reset) */
export async function clearAllStatsCache(): Promise<void> {
  Object.keys(memCache).forEach((k) => delete memCache[k]);

  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(CACHE_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {}
}
