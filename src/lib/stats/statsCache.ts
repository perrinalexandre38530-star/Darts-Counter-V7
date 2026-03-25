// ============================================
// src/lib/stats/statsCache.ts
// Cache stats local ultra-rapide (mémoire + IndexedDB KV)
// -> plus de persistance volumineuse en localStorage
// ============================================

import { delKV, getKV, setKV } from "../storage";

type CacheMap = Record<string, any>;

const CACHE_PREFIX = "dc_stats_cache_v2:";
const memCache: CacheMap = {};

function key(profileId: string) {
  return `${CACHE_PREFIX}${profileId}`;
}

export async function loadStatsCache(profileId: string): Promise<any | null> {
  const k = key(profileId);
  if (Object.prototype.hasOwnProperty.call(memCache, k)) return memCache[k] ?? null;

  try {
    const parsed = await getKV<any>(k);
    if (parsed == null) {
      memCache[k] = null;
      return null;
    }
    memCache[k] = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveStatsCache(profileId: string, data: any): Promise<void> {
  const k = key(profileId);
  memCache[k] = data;
  await setKV(k, data).catch((e) => {
    console.warn("[statsCache] save failed:", e);
  });
}

export async function clearStatsCache(profileId: string): Promise<void> {
  const k = key(profileId);
  delete memCache[k];
  await delKV(k).catch(() => {});
}

export async function clearAllStatsCache(): Promise<void> {
  Object.keys(memCache).forEach((k) => delete memCache[k]);
  // Pas de scan global IDB ici pour éviter un coût inutile au boot.
  // Les anciennes clés orphelines n'empêchent pas le fonctionnement.
}
