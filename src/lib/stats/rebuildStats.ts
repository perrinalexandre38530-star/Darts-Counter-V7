// ============================================
// src/lib/stats/rebuildStats.ts
// Rebuild stats cache (safe build)
// ✅ zéro import statique (évite "Failed to resolve import")
// ✅ exports : rebuildStatsForProfile (utilisé dans App.tsx)
// ✅ cache localStorage + event "dc-stats-cache-updated"
// ============================================

export type StatsBundle = {
  v: number;
  profileId: string;
  updatedAt: number;

  // (optionnel) si plus tard tu veux stocker un dashboard prêt
  dashboard?: any;

  x01?: any;
  cricket?: any;
  dartSets?: any;
  [k: string]: any;
};

const VERSION = 1;

// ✅ IMPORTANT : on supporte TOUTES les variantes de clés utilisées dans l’app
const CACHE_PREFIXES = [
  "dc_stats_cache_v1:",     // ✅ StatsHub lit ça
  "dc_stats_cache:",        // ✅ StatsHub lit ça
  "dc-stats-cache:",        // ✅ StatsHub lit ça
  "dc-stats-cache-v1:",     // ✅ ton ancien writer (fallback)
];

const inflight = new Map<string, Promise<StatsBundle>>();
const lastKick = new Map<string, number>();

function now() {
  return Date.now();
}

function normPid(profileId: string) {
  return String(profileId || "unknown");
}

function cacheKeys(profileId: string) {
  const pid = normPid(profileId);
  return CACHE_PREFIXES.map((p) => `${p}${pid}`);
}

function idle(cb: () => void, timeoutMs = 1200) {
  try {
    const ric = (globalThis as any).requestIdleCallback;
    if (typeof ric === "function") {
      ric(
        () => {
          try {
            cb();
          } catch {}
        },
        { timeout: timeoutMs }
      );
      return;
    }
  } catch {}
  setTimeout(() => {
    try {
      cb();
    } catch {}
  }, 0);
}

export function getCachedStatsSync(profileId: string): StatsBundle | null {
  const keys = cacheKeys(profileId);

  for (const k of keys) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const obj = JSON.parse(raw);
      // tolérance: si v absent on accepte quand même (certains caches legacy)
      if (!obj || (obj.v != null && obj.v !== VERSION)) continue;
      return obj as StatsBundle;
    } catch {
      // continue
    }
  }
  return null;
}

export async function getCachedStats(profileId: string): Promise<StatsBundle | null> {
  return getCachedStatsSync(profileId);
}

function emitUpdated(profileId: string, reason: string) {
  try {
    window.dispatchEvent(
      new CustomEvent("dc-stats-cache-updated", {
        detail: { profileId: normPid(profileId), reason },
      })
    );
  } catch {}
}

/**
 * ✅ Tente de calculer via tes compute existants.
 * - On essaye plusieurs chemins + noms d'exports
 * - Si rien trouvé → retourne {}
 */
async function computeAll(
  profileId: string
): Promise<Pick<StatsBundle, "x01" | "cricket" | "dartSets">> {
  const pid = normPid(profileId);

  let x01: any = null;
  let cricket: any = null;
  let dartSets: any = null;

  // --- X01 ---
  try {
    const m: any = await import("./computeX01Stats").catch(() => null);
    const fn =
      (m && (m.computeX01Stats || m.default || m.computeStats || m.buildX01Stats)) || null;
    if (typeof fn === "function") x01 = await fn(pid);
  } catch {}

  // --- Cricket ---
  try {
    const m: any = await import("./computeCricketStats").catch(() => null);
    const fn =
      (m && (m.computeCricketStats || m.default || m.computeStats || m.buildCricketStats)) || null;
    if (typeof fn === "function") cricket = await fn(pid);
  } catch {}

  // --- DartSets ---
  try {
    const m: any = await import("./computeDartSetStats").catch(() => null);
    const fn =
      (m &&
        (m.computeDartSetsStats ||
          m.computeDartSetStats ||
          m.computeDartsetStats ||
          m.default ||
          m.computeStats ||
          m.buildDartSetsStats)) ||
      null;
    if (typeof fn === "function") dartSets = await fn(pid);
  } catch {}

  return { x01, cricket, dartSets };
}

function writeCacheAllKeys(profileId: string, bundle: StatsBundle) {
  const pid = normPid(profileId);
  const raw = JSON.stringify(bundle);

  // ✅ on écrit sur TOUTES les clés pour compat maximale
  for (const k of cacheKeys(pid)) {
    try {
      localStorage.setItem(k, raw);
    } catch {
      // si quota localStorage => on essaye au moins une clé
    }
  }
}

/**
 * ✅ API attendue par ton App.tsx
 * Rebuild complet + cache localStorage
 */
export async function rebuildStatsForProfile(profileId: string): Promise<StatsBundle> {
  const pid = normPid(profileId);

  const existing = inflight.get(pid);
  if (existing) return existing;

  const p = (async () => {
    const { x01, cricket, dartSets } = await computeAll(pid);

    const out: StatsBundle = {
      v: VERSION,
      profileId: pid,
      updatedAt: now(),
      x01: x01 ?? undefined,
      cricket: cricket ?? undefined,
      dartSets: dartSets ?? undefined,
    };

    try {
      writeCacheAllKeys(pid, out);
    } catch {}

    emitUpdated(pid, "rebuild_done");
    return out;
  })();

  inflight.set(pid, p);

  try {
    return await p;
  } finally {
    inflight.delete(pid);
  }
}

/**
 * ✅ Rebuild en idle + throttle (pour éviter spam)
 */
export function scheduleRebuild(profileId: string, reason = "idle") {
  const pid = normPid(profileId);
  const t = now();
  const last = lastKick.get(pid) || 0;

  if (t - last < 800) return;
  lastKick.set(pid, t);

  idle(() => {
    rebuildStatsForProfile(pid)
      .then(() => emitUpdated(pid, reason))
      .catch(() => {});
  }, 2000);
}
