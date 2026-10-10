// @ts-nocheck
// Cache local dérivé pour le premier rendu des pages Stats.
// IMPORTANT : ne contient jamais la source de vérité. En cas de quota saturé,
// seules d'anciennes clés de cache peuvent être supprimées ; History/IndexedDB,
// profils, authentification et sauvegardes ne sont jamais touchés.

const OBSOLETE_DERIVED_PREFIXES = [
  "dc_stats_dartsets_render_cache_v1:",
  "dc_stats_dartsets_render_cache_v2:",
  "dc_stats_dartsets_render_cache_v3:",
  "dc_stats_dartsets_quick_v2:",
  "dc_stats_dartsets_quick_v3:",
  "dc_stats_dartsets_quick_v4:",
  "dc_x01_multi_quick_v1:",
  "dc_x01_multi_quick_v2:",
  "dc_x01_multi_quick_v3:",
  "dc_stats_render_profile_v3:",
  "dc_stats_render_cache_v1",
  "dc_stats_render_cache_v2",
  "dc_stats_render_cache_v3",
  "dc_stats_cache_v1:",
  "dc_stats_cache_v2:",
];

const CURRENT_LIGHT_PREFIXES = [
  "dc_stats_dartsets_render_cache_v4:",
  "dc_stats_dartsets_quick_v5:",
  "dc_x01_multi_quick_v4:",
  "dc_stats_x01_compare_samples_v2:",
  "dc_stats_x01_compare_samples_v3:",
  "dc_stats_cricket_profile_v2:",
  "dc_stats_x01_legs_sets_v2:",
  "dc_stats_render_profile_v4:",
];

// Le cache complet X01 Multi existe déjà dans IndexedDB. Toute copie
// localStorage de ses anciennes versions est donc strictement redondante.
const REDUNDANT_LARGE_PREFIXES = [
  "dc_x01_multi_sessions_v1:",
  "dc_x01_multi_sessions_v2:",
  "dc_x01_multi_sessions_v3:",
  "dc_x01_multi_sessions_v4:",
];
const LAST_RESORT_DERIVED_PREFIXES = ["dc-history-ui-cache-v1"];
let __obsoleteDerivedCachesPurged = false;

function isQuotaError(error: any): boolean {
  const name = String(error?.name || "");
  const code = Number(error?.code || 0);
  return name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED" || code === 22 || code === 1014;
}

function listStorageKeys(): string[] {
  const out: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key) out.push(key);
    }
  } catch {}
  return out;
}

function removeByPrefixes(prefixes: string[], exceptKey = ""): number {
  let removed = 0;
  for (const key of listStorageKeys()) {
    if (key === exceptKey || !prefixes.some((prefix) => key.startsWith(prefix))) continue;
    try {
      localStorage.removeItem(key);
      removed += 1;
    } catch {}
  }
  return removed;
}


export function purgeObsoleteDerivedStatsCaches(): number {
  if (typeof localStorage === "undefined") return 0;
  const removed = removeByPrefixes([...OBSOLETE_DERIVED_PREFIXES, ...REDUNDANT_LARGE_PREFIXES]);
  __obsoleteDerivedCachesPurged = true;
  return removed;
}

function ensureObsoleteDerivedStatsCachesPurged(): void {
  if (__obsoleteDerivedCachesPurged) return;
  try { purgeObsoleteDerivedStatsCaches(); } catch {}
}

/**
 * Réserve d'urgence pour les écritures critiques (auth/session).
 * Ne supprime QUE des caches recalculables. Historique, profils, auth et
 * sauvegardes ne font jamais partie de ces préfixes.
 */
export function reclaimDerivedStatsStorageForCriticalWrite(): number {
  if (typeof localStorage === "undefined") return 0;
  let removed = purgeObsoleteDerivedStatsCaches();
  removed += removeByPrefixes(CURRENT_LIGHT_PREFIXES);
  removed += removeByPrefixes(LAST_RESORT_DERIVED_PREFIXES);
  return removed;
}

function profileSuffixFromCacheKey(key: string): string {
  const idx = String(key || "").lastIndexOf(":");
  return idx >= 0 ? String(key).slice(idx + 1) : "";
}

function removeOtherProfilesCurrentCaches(targetKey: string): number {
  const targetSuffix = profileSuffixFromCacheKey(targetKey);
  let removed = 0;
  const candidates = listStorageKeys()
    .filter((key) => key !== targetKey && CURRENT_LIGHT_PREFIXES.some((prefix) => key.startsWith(prefix)))
    .map((key) => {
      let size = 0;
      try { size = localStorage.getItem(key)?.length || 0; } catch {}
      return { key, size, sameProfile: !!targetSuffix && profileSuffixFromCacheKey(key) === targetSuffix };
    })
    // D'abord les autres profils, et parmi eux les plus grosses clés.
    .sort((a, b) => Number(a.sameProfile) - Number(b.sameProfile) || b.size - a.size);

  for (const item of candidates) {
    // On protège les snapshots du profil actif à cette étape.
    if (item.sameProfile) continue;
    try {
      localStorage.removeItem(item.key);
      removed += 1;
    } catch {}
  }
  return removed;
}

function trySet(key: string, raw: string): boolean {
  try {
    localStorage.setItem(key, raw);
    return true;
  } catch {
    return false;
  }
}

export function readDerivedStatsCacheRaw(key: string): string | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(String(key || ""));
  } catch {
    return null;
  }
}

export function removeDerivedStatsCache(key: string): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(String(key || ""));
  } catch {}
}

export function writeDerivedStatsCacheRaw(key: string, raw: string, maxChars: number): boolean {
  ensureObsoleteDerivedStatsCachesPurged();
  const cacheKey = String(key || "");
  const payload = String(raw || "");
  if (!cacheKey || typeof localStorage === "undefined") return false;
  if (Number(maxChars || 0) > 0 && payload.length > Number(maxChars)) return false;

  try {
    localStorage.setItem(cacheKey, payload);
    return true;
  } catch (error) {
    if (!isQuotaError(error)) return false;
  }

  // Étape 1 : anciennes versions + duplication complète X01 déjà sauvegardée en IDB.
  removeByPrefixes([...OBSOLETE_DERIVED_PREFIXES, ...REDUNDANT_LARGE_PREFIXES], cacheKey);
  if (trySet(cacheKey, payload)) return true;

  // Étape 2 : snapshots d'autres profils. Le profil actif reste protégé.
  removeOtherProfilesCurrentCaches(cacheKey);
  if (trySet(cacheKey, payload)) return true;

  // Étape 3 : uniquement le cache UI Historique, lui aussi entièrement dérivé.
  // Les matchs réels restent dans IndexedDB et ne sont jamais supprimés.
  removeByPrefixes(LAST_RESORT_DERIVED_PREFIXES, cacheKey);
  return trySet(cacheKey, payload);
}

export function writeDerivedStatsCacheJson(key: string, value: any, maxChars: number): boolean {
  try {
    const raw = JSON.stringify(value);
    return writeDerivedStatsCacheRaw(key, raw, maxChars);
  } catch {
    return false;
  }
}
