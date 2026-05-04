// src/lib/stats/rebuildStatsFromHistory.ts
// ============================================
// Rebuild STATS depuis l'Historique (source de vérité)
// - Persistance principale en IndexedDB (KV), plus robuste que localStorage
// - Fallback legacy localStorage conservé pour migration douce
// - Prépare un vrai stats_index centralisé pour éviter les stats vides
// ============================================

import { delKV, getKV, setKV } from "../storage";
import { normalizeMatchForStats } from "../matchCompactCodec";

// ----------------------------
// Types génériques (safe)
// ----------------------------
export type GameKey =
  | "x01"
  | "cricket"
  | "killer"
  | "golf"
  | "shanghai"
  | "territories"
  | "scram"
  | "batard"
  | "unknown";

export type HistoryRec = {
  id: string;
  status?: "in_progress" | "finished" | "saved" | string;
  createdAt?: number | string;
  updatedAt?: number | string;
  game?: string;
  mode?: string;
  payload?: any;
  payloadCompressed?: string;
};

export type PlayerAgg = {
  playerId: string;
  name?: string;
  matches: number;
  wins: number;
  losses: number;
  dartsThrown?: number;
  pointsScored?: number;
  avg3?: number;
  bestVisit?: number;
  bestCheckout?: number;
  buckets?: Record<string, number>;
  lastMatchAt?: number;
};

export type ModeAgg = {
  mode: GameKey;
  matches: number;
  finished: number;
  inProgress: number;
  saved: number;
  lastMatchAt?: number;
};

export type StatsIndexMeta = {
  source: "history-rebuild" | "idb-cache" | "localStorage-legacy";
  rowsScanned: number;
  includeNonFinished: boolean;
  historyUpdatedAt?: number;
};

export type StatsIndex = {
  version: number;
  rebuiltAt: number;
  totals: {
    matches: number;
    finished: number;
    inProgress: number;
    saved: number;
  };
  byMode: Record<GameKey, ModeAgg>;
  byPlayer: Record<string, PlayerAgg>;
  matchIdsByMode: Record<GameKey, string[]>;
  meta?: StatsIndexMeta;
};

const STATS_KEY = "dc_stats_index_v2";
const STATS_LEGACY_KEY = "dc-stats-index-v1";
const STATS_VERSION = 2;
const STATS_REFRESH_DEBOUNCE_MS = 900;
const STATS_DIRTY_KEY = "dc_stats_index_dirty_v1";
let __statsRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let __statsRefreshPromise: Promise<StatsIndex> | null = null;

export function markStatsIndexDirty(reason = "unknown"): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STATS_DIRTY_KEY, JSON.stringify({ dirty: true, reason, at: Date.now() }));
    }
  } catch {}
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dc-stats-index-dirty", { detail: { reason, at: Date.now() } }));
    }
  } catch {}
}

export function clearStatsIndexDirty(): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(STATS_DIRTY_KEY);
  } catch {}
}

export function isStatsIndexDirty(): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    return !!localStorage.getItem(STATS_DIRTY_KEY);
  } catch {
    return false;
  }
}

function dispatchStatsIndexUpdated(detail?: any) {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dc-stats-index-updated", { detail: detail ?? null }));
    }
  } catch {}
}


function createEmptyStatsIndex(includeNonFinished = false): StatsIndex {
  return {
    version: STATS_VERSION,
    rebuiltAt: Date.now(),
    totals: { matches: 0, finished: 0, inProgress: 0, saved: 0 },
    byMode: {
      x01: { mode: "x01", matches: 0, finished: 0, inProgress: 0, saved: 0 },
      cricket: { mode: "cricket", matches: 0, finished: 0, inProgress: 0, saved: 0 },
      killer: { mode: "killer", matches: 0, finished: 0, inProgress: 0, saved: 0 },
      golf: { mode: "golf", matches: 0, finished: 0, inProgress: 0, saved: 0 },
      shanghai: { mode: "shanghai", matches: 0, finished: 0, inProgress: 0, saved: 0 },
      territories: { mode: "territories", matches: 0, finished: 0, inProgress: 0, saved: 0 },
      scram: { mode: "scram", matches: 0, finished: 0, inProgress: 0, saved: 0 },
      batard: { mode: "batard", matches: 0, finished: 0, inProgress: 0, saved: 0 },
      unknown: { mode: "unknown", matches: 0, finished: 0, inProgress: 0, saved: 0 },
    },
    byPlayer: {},
    matchIdsByMode: {
      x01: [],
      cricket: [],
      killer: [],
      golf: [],
      shanghai: [],
      territories: [],
      scram: [],
      batard: [],
      unknown: [],
    },
    meta: {
      source: "history-rebuild",
      rowsScanned: 0,
      includeNonFinished,
      historyUpdatedAt: undefined,
    },
  };
}

function isValidStatsIndex(v: any): v is StatsIndex {
  return !!v && typeof v === "object" && Number(v.version) === STATS_VERSION && !!v.byMode && !!v.byPlayer && !!v.totals;
}

function tryLoadLegacyStatsIndex(): StatsIndex | null {
  try {
    const raw = localStorage.getItem(STATS_LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const migrated: StatsIndex = {
      ...createEmptyStatsIndex(Boolean(parsed?.meta?.includeNonFinished)),
      ...parsed,
      version: STATS_VERSION,
      rebuiltAt: Number(parsed?.rebuiltAt || Date.now()) || Date.now(),
      meta: {
        source: "localStorage-legacy",
        rowsScanned: Number(parsed?.meta?.rowsScanned || parsed?.totals?.matches || 0) || 0,
        includeNonFinished: Boolean(parsed?.meta?.includeNonFinished),
        historyUpdatedAt: Number(parsed?.meta?.historyUpdatedAt || 0) || undefined,
      },
    };
    return migrated;
  } catch {
    return null;
  }
}

export async function loadStatsIndex(): Promise<StatsIndex | null> {
  try {
    const fromKv = await getKV<StatsIndex>(STATS_KEY);
    if (isValidStatsIndex(fromKv)) {
      return {
        ...fromKv,
        meta: {
          source: "idb-cache",
          rowsScanned: Number(fromKv?.meta?.rowsScanned || 0) || 0,
          includeNonFinished: Boolean(fromKv?.meta?.includeNonFinished),
          historyUpdatedAt: Number(fromKv?.meta?.historyUpdatedAt || 0) || undefined,
        },
      };
    }
  } catch {}

  const legacy = tryLoadLegacyStatsIndex();
  if (legacy) {
    await saveStatsIndex(legacy).catch(() => {});
    try {
      localStorage.removeItem(STATS_LEGACY_KEY);
    } catch {}
    return legacy;
  }

  return null;
}

export async function saveStatsIndex(idx: StatsIndex): Promise<void> {
  const payload: StatsIndex = {
    ...idx,
    version: STATS_VERSION,
    rebuiltAt: Number(idx?.rebuiltAt || Date.now()) || Date.now(),
    meta: {
      source: "history-rebuild",
      rowsScanned: Number(idx?.meta?.rowsScanned || idx?.totals?.matches || 0) || 0,
      includeNonFinished: Boolean(idx?.meta?.includeNonFinished),
      historyUpdatedAt: Number(idx?.meta?.historyUpdatedAt || 0) || undefined,
    },
  };

  await setKV(STATS_KEY, payload);

  // migration douce : on nettoie l'ancien stockage localStorage
  try {
    localStorage.removeItem(STATS_LEGACY_KEY);
  } catch {}
}

export async function clearStatsIndex(): Promise<void> {
  await delKV(STATS_KEY).catch(() => {});
  try {
    localStorage.removeItem(STATS_LEGACY_KEY);
  } catch {}
}

function computeHistoryUpdatedAt(rows: any[]): number | undefined {
  let out = 0;
  for (const rec of Array.isArray(rows) ? rows : []) {
    const ts = toTs(rec?.updatedAt) ?? toTs(rec?.createdAt) ?? 0;
    if (ts > out) out = ts;
  }
  return out || undefined;
}

function toTs(v: any): number | undefined {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Date.parse(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function normalizeGameKey(rec: any, payload: any): GameKey {
  const g = (rec?.game || rec?.mode || rec?.kind || payload?.game || payload?.mode || payload?.kind || "")
    .toString()
    .toLowerCase();

  if (g.includes("x01") || g.includes("301") || g.includes("501")) return "x01";
  if (g.includes("cricket")) return "cricket";
  if (g.includes("killer")) return "killer";
  if (g.includes("golf")) return "golf";
  if (g.includes("shanghai")) return "shanghai";
  if (g.includes("territ")) return "territories";
  if (g.includes("scram")) return "scram";
  if (g.includes("batard") || g.includes("bastard")) return "batard";
  if (payload?.x01 || payload?.startScore || payload?.legs || payload?.sets) return "x01";
  return "unknown";
}

function bumpMode(idx: StatsIndex, mode: GameKey, status?: string, ts?: number) {
  const m = idx.byMode[mode] || {
    mode,
    matches: 0,
    finished: 0,
    inProgress: 0,
    saved: 0,
    lastMatchAt: undefined,
  };

  m.matches += 1;

  const st = (status || "").toLowerCase();
  if (st.includes("finish")) m.finished += 1;
  else if (st.includes("progress") || st.includes("in_progress")) m.inProgress += 1;
  else if (st.includes("save")) m.saved += 1;
  else m.inProgress += 1;

  if (ts && (!m.lastMatchAt || ts > m.lastMatchAt)) m.lastMatchAt = ts;

  idx.byMode[mode] = m;
  idx.matchIdsByMode[mode] = idx.matchIdsByMode[mode] || [];
}

function bumpPlayer(idx: StatsIndex, playerId: string, patch: Partial<PlayerAgg>, ts?: number) {
  const p = idx.byPlayer[playerId] || {
    playerId,
    matches: 0,
    wins: 0,
    losses: 0,
    dartsThrown: 0,
    pointsScored: 0,
    avg3: 0,
    bestVisit: 0,
    bestCheckout: 0,
    buckets: {},
    lastMatchAt: undefined,
  };

  if (patch.name) p.name = patch.name;
  if (typeof patch.matches === "number") p.matches += patch.matches;
  if (typeof patch.wins === "number") p.wins += patch.wins;
  if (typeof patch.losses === "number") p.losses += patch.losses;
  if (typeof patch.dartsThrown === "number") p.dartsThrown = (p.dartsThrown || 0) + patch.dartsThrown;
  if (typeof patch.pointsScored === "number") p.pointsScored = (p.pointsScored || 0) + patch.pointsScored;
  if (typeof patch.bestVisit === "number") p.bestVisit = Math.max(Number(p.bestVisit || 0) || 0, patch.bestVisit);
  if (typeof patch.bestCheckout === "number") p.bestCheckout = Math.max(Number(p.bestCheckout || 0) || 0, patch.bestCheckout);
  if (patch.buckets && typeof patch.buckets === "object") {
    const cur = (p.buckets && typeof p.buckets === "object") ? p.buckets : {};
    const nxt: Record<string, number> = { ...cur };
    for (const [k, v] of Object.entries(patch.buckets || {})) {
      const n = Number(v || 0) || 0;
      if (!n) continue;
      nxt[k] = (Number(nxt[k] || 0) || 0) + n;
    }
    p.buckets = nxt;
  }
  const darts = Number(p.dartsThrown || 0) || 0;
  const points = Number(p.pointsScored || 0) || 0;
  p.avg3 = darts > 0 ? (points / darts) * 3 : 0;
  if (ts && (!p.lastMatchAt || ts > p.lastMatchAt)) p.lastMatchAt = ts;

  idx.byPlayer[playerId] = p;
}

function makeVisitBuckets(bestVisit: number): Record<string, number> {
  const score = Number(bestVisit || 0) || 0;
  if (score >= 180) return { "180": 1 };
  if (score >= 140) return { "140+": 1 };
  if (score >= 100) return { "100+": 1 };
  if (score >= 60) return { "60-99": 1 };
  return { "0-59": 1 };
}

function extractX01QuickMetrics(pl: any): { dartsThrown: number; pointsScored: number; bestVisit: number; bestCheckout: number; buckets: Record<string, number> } {
  const dartsThrown =
    Number(pl?.dartsThrown ?? pl?.darts ?? pl?.stats?.dartsThrown ?? pl?.stats?.dartsTotal ?? 0) || 0;
  let pointsScored =
    Number(pl?.pointsScored ?? pl?.scored ?? pl?.stats?.pointsScored ?? pl?.stats?.points ?? pl?.score ?? 0) || 0;
  let bestVisit =
    Number(pl?.bestVisit ?? pl?.stats?.bestVisit ?? pl?.stats?.best_visit ?? 0) || 0;
  let bestCheckout =
    Number(pl?.bestCheckout ?? pl?.stats?.bestCheckout ?? pl?.stats?.bestFinish ?? 0) || 0;
  let buckets: Record<string, number> = {};

  const visits = Array.isArray(pl?.visits) ? pl.visits : Array.isArray(pl?.stats?.visits) ? pl.stats.visits : [];
  if (visits.length) {
    let total = 0;
    for (const v of visits) {
      const score = Number(v?.score ?? 0) || 0;
      total += score;
      if (!v?.bust) {
        if (score > bestVisit) bestVisit = score;
        if (v?.isCheckout && score > bestCheckout) bestCheckout = score;
      }
      const b = makeVisitBuckets(score);
      for (const [k, n] of Object.entries(b)) buckets[k] = (Number(buckets[k] || 0) || 0) + (Number(n || 0) || 0);
    }
    if (!pointsScored && total) pointsScored = total;
  }

  if (!Object.keys(buckets).length) buckets = makeVisitBuckets(bestVisit);
  return { dartsThrown, pointsScored, bestVisit, bestCheckout, buckets };
}

type Extractor = (args: {
  rec: any;
  payload: any;
  mode: GameKey;
  ts?: number;
  idx: StatsIndex;
}) => void;

const extractors: Partial<Record<GameKey, Extractor>> = {
  x01: ({ payload, ts, idx }) => {
    const players = payload?.players || payload?.state?.players || payload?.snapshot?.players || payload?.match?.players || [];
    const winnerId = payload?.winnerId || payload?.state?.winnerId || payload?.result?.winnerId || payload?.winner?.id;

    for (const pl of Array.isArray(players) ? players : []) {
      const pid = (pl?.id || pl?.playerId || pl?.uid || pl?.profileId || "").toString();
      if (!pid) continue;
      const name = pl?.name || pl?.displayName;
      const { dartsThrown, pointsScored, bestVisit, bestCheckout, buckets } = extractX01QuickMetrics(pl);
      const isWinner = winnerId && pid === String(winnerId);

      bumpPlayer(
        idx,
        pid,
        {
          name,
          matches: 1,
          wins: isWinner ? 1 : 0,
          losses: winnerId ? (isWinner ? 0 : 1) : 0,
          dartsThrown,
          pointsScored,
          bestVisit,
          bestCheckout,
          buckets,
        },
        ts
      );
    }
  },

  killer: ({ payload, ts, idx }) => {
    const players = payload?.players || payload?.state?.players || payload?.summary?.players || [];
    const winnerId =
      payload?.winnerId || payload?.state?.winnerId || payload?.result?.winnerId || payload?.summary?.winnerId || null;

    for (const pl of Array.isArray(players) ? players : []) {
      const pid = (pl?.id || pl?.playerId || pl?.uid || "").toString();
      if (!pid) continue;
      const kills = Number(pl?.kills ?? pl?.stats?.kills ?? pl?.special?.kills ?? 0) || 0;
      const hitsTotal = Number(pl?.hitsTotal ?? pl?.stats?.hitsTotal ?? pl?.special?.hitsTotal ?? 0) || 0;

      bumpPlayer(
        idx,
        pid,
        {
          name: pl?.name,
          matches: 1,
          wins: winnerId && String(winnerId) === pid ? 1 : 0,
          losses: winnerId && String(winnerId) !== pid ? 1 : 0,
          bestVisit: hitsTotal,
        },
        ts
      );

      (idx.byPlayer[pid] as any).killer = {
        kills: Number(((idx.byPlayer[pid] as any).killer?.kills || 0) + kills) || 0,
      };
    }
  },

  cricket: ({ payload, ts, idx }) => {
    const players = payload?.players || payload?.state?.players || payload?.summary?.players || payload?.stats?.players || [];
    const winnerId =
      payload?.winnerId || payload?.state?.winnerId || payload?.result?.winnerId || payload?.summary?.winnerId || null;

    for (const pl of Array.isArray(players) ? players : []) {
      const pid = (pl?.id || pl?.playerId || pl?.uid || pl?.profileId || "").toString();
      if (!pid) continue;

      const marksObj = pl?.marks && typeof pl.marks === "object" ? pl.marks : null;
      const marksTotal =
        Number(pl?.marksTotal ?? pl?.stats?.marksTotal ?? pl?.special?.marksTotal ?? 0) ||
        (marksObj ? Object.values(marksObj).reduce((a: any, b: any) => (Number(a) || 0) + (Number(b) || 0), 0) : 0);

      const hitsArr = Array.isArray(pl?.hits) ? pl.hits : [];
      const hits =
        Number(pl?.hitCount ?? pl?.hitsCount ?? pl?.stats?.hitCount ?? 0) ||
        hitsArr.filter((h: any) => h && h.ring !== "MISS" && h.segment !== "MISS").length ||
        hitsArr.length;

      const dartsThrown =
        Number(pl?.darts ?? pl?.dartsThrown ?? pl?.stats?.darts ?? pl?.stats?.dartsThrown ?? 0) ||
        hitsArr.length ||
        Number(pl?.legStats?.darts ?? 0) ||
        0;

      const pointsScored = Number(pl?.score ?? pl?.points ?? pl?.stats?.score ?? 0) || 0;

      const mpr = dartsThrown > 0 ? (marksTotal / dartsThrown) * 3 : 0;
      bumpPlayer(
        idx,
        pid,
        {
          name: pl?.name,
          matches: 1,
          wins: winnerId && String(winnerId) === pid ? 1 : 0,
          losses: winnerId && String(winnerId) !== pid ? 1 : 0,
          dartsThrown,
          pointsScored,
          bestVisit: Math.max(Number(pl?.bestRoundMarks ?? 0) || 0, marksTotal > 0 ? Math.min(9, marksTotal) : 0),
          buckets: makeVisitBuckets(Math.round(mpr * 20)),
        },
        ts
      );

      const cur: any = (idx.byPlayer[pid] as any).cricket || { marks: 0, hits: 0, darts: 0, score: 0 };
      cur.marks += marksTotal;
      cur.hits += hits;
      cur.darts += dartsThrown;
      cur.score += pointsScored;
      (idx.byPlayer[pid] as any).cricket = cur;
    }
  },

  golf: ({ rec, payload, ts, idx }) => {
    const players = payload?.players || rec?.players || payload?.summary?.players || [];

    const pidOrder = (Array.isArray(players) ? players : [])
      .map((p: any) => String(p?.id || p?.playerId || p?.profileId || ""))
      .filter(Boolean);

    const statsArray = Array.isArray(payload?.state?.statsByPlayer)
      ? payload.state.statsByPlayer
      : Array.isArray(payload?.statsByPlayer)
      ? payload.statsByPlayer
      : null;

    const statsObj =
      (!Array.isArray(payload?.state?.statsByPlayer) && payload?.state?.statsByPlayer && typeof payload.state.statsByPlayer === "object"
        ? payload.state.statsByPlayer
        : null) ||
      (payload?.statsByPlayer && typeof payload.statsByPlayer === "object" && !Array.isArray(payload.statsByPlayer)
        ? payload.statsByPlayer
        : null) ||
      (payload?.playerStats && typeof payload.playerStats === "object" && !Array.isArray(payload.playerStats)
        ? payload.playerStats
        : null) ||
      (payload?.summary?.playerStats && typeof payload.summary.playerStats === "object" && !Array.isArray(payload.summary.playerStats)
        ? payload.summary.playerStats
        : null) ||
      null;

    for (let i = 0; i < pidOrder.length; i++) {
      const pid = pidOrder[i];
      if (!pid) continue;
      const p = (statsArray ? statsArray[i] : null) || (statsObj ? statsObj[pid] : null) || {};
      const total =
        Number(p?.total ?? p?.score ?? 0) ||
        Number(payload?.summary?.rankings?.find?.((r: any) => String(r?.id) === pid)?.total ?? 0) ||
        0;

      const dartsThrown = Number(p?.darts ?? 0) || 0;
      bumpPlayer(idx, pid, { matches: 1, dartsThrown, pointsScored: total, bestVisit: total }, ts);

      const cur: any = (idx.byPlayer[pid] as any).golf || {
        total: 0,
        single: 0,
        double: 0,
        triple: 0,
        bull: 0,
        dbull: 0,
        miss: 0,
        turns: 0,
        hit1: 0,
        hit2: 0,
        hit3: 0,
      };

      cur.total += total;
      cur.single += Number(p?.s ?? p?.single ?? 0) || 0;
      cur.double += Number(p?.d ?? p?.double ?? 0) || 0;
      cur.triple += Number(p?.t ?? p?.triple ?? 0) || 0;
      cur.bull += Number(p?.b ?? p?.bull ?? 0) || 0;
      cur.dbull += Number(p?.db ?? p?.dbull ?? 0) || 0;
      cur.miss += Number(p?.miss ?? 0) || 0;
      cur.turns += Number(p?.turns ?? 0) || 0;
      cur.hit1 += Number(p?.hit1 ?? 0) || 0;
      cur.hit2 += Number(p?.hit2 ?? 0) || 0;
      cur.hit3 += Number(p?.hit3 ?? 0) || 0;

      (idx.byPlayer[pid] as any).golf = cur;
    }
  },

  shanghai: ({ payload, ts, idx }) => {
    const stats = payload?.statsShanghai || payload?.stats?.statsShanghai || payload?.summary?.statsShanghai || {};
    const rounds = stats?.rounds || payload?.rounds || [];
    const players = payload?.players || payload?.summary?.players || stats?.players || [];
    const winnerId = payload?.winnerId || payload?.summary?.winnerId || payload?.result?.winnerId || null;

    const totalsByPlayer: Record<string, { name?: string; total: number; hits: number }> = {};

    if (Array.isArray(players)) {
      for (const pl of players) {
        const pid = String(pl?.id || pl?.playerId || pl?.profileId || "");
        if (!pid) continue;
        totalsByPlayer[pid] = {
          name: pl?.name || pl?.displayName,
          total: Number(pl?.score ?? pl?.totalScore ?? 0) || 0,
          hits: Number(pl?.hitsTotal ?? pl?.hits ?? 0) || 0,
        };
      }
    }

    if (stats?.scoreTimelineById && typeof stats.scoreTimelineById === "object") {
      for (const [pidRaw, timeline] of Object.entries(stats.scoreTimelineById)) {
        const pid = String(pidRaw || "");
        const arr = Array.isArray(timeline) ? timeline : [];
        const total = Number(arr[arr.length - 1] ?? 0) || 0;
        totalsByPlayer[pid] = { ...(totalsByPlayer[pid] || {}), total, hits: totalsByPlayer[pid]?.hits || 0 };
      }
    }

    if (Array.isArray(rounds)) {
      for (const r of rounds) {
        const pid = String(r?.playerId || r?.id || "");
        if (!pid) continue;
        const prev = totalsByPlayer[pid] || { total: 0, hits: 0 };
        // Si on a déjà une timeline ou un total player, on ne remplace pas par un cumul partiel faux.
        if (!prev.total) prev.total += Number(r?.score || 0) || 0;
        prev.hits += Number(r?.hits ?? r?.S ?? 0) || 0;
        totalsByPlayer[pid] = prev;
      }
    }

    for (const [pid, row] of Object.entries(totalsByPlayer)) {
      const total = Number((row as any)?.total || 0) || 0;
      const hits = Number((row as any)?.hits || 0) || 0;
      bumpPlayer(idx, pid, {
        name: (row as any)?.name,
        matches: 1,
        wins: winnerId && String(winnerId) === pid ? 1 : 0,
        losses: winnerId && String(winnerId) !== pid ? 1 : 0,
        pointsScored: total,
        bestVisit: total,
      }, ts);
      const cur: any = (idx.byPlayer[pid] as any).shanghai || { total: 0, min: undefined, max: 0, hits: 0 };
      cur.total += total;
      cur.hits += hits;
      cur.min = cur.min == null ? total : Math.min(cur.min, total);
      cur.max = Math.max(cur.max || 0, total);
      (idx.byPlayer[pid] as any).shanghai = cur;
    }
  },

  territories: ({ payload, ts, idx }) => {
    const data = payload || {};
    const sum = (arr: any[]) =>
      Array.isArray(arr) ? arr.reduce((a: number, b: any) => a + (Number(b) || 0), 0) : 0;

    const players = payload?.players || payload?.state?.players || payload?.summary?.players || [];

    for (const pl of Array.isArray(players) ? players : []) {
      const pid = String(pl?.id || pl?.playerId || pl?.profileId || "");
      if (!pid) continue;

      bumpPlayer(idx, pid, { name: pl?.name, matches: 1 }, ts);

      const cur: any = (idx.byPlayer[pid] as any).territories || { captured: 0, darts: 0, steals: 0, lost: 0 };
      cur.captured += sum(data?.captured ?? pl?.captured);
      cur.darts += sum(data?.darts ?? pl?.darts);
      cur.steals += sum(data?.steals ?? pl?.steals);
      cur.lost += sum(data?.lost ?? pl?.lost);
      (idx.byPlayer[pid] as any).territories = cur;
    }
  },
};

export async function refreshStatsIndexFromHistoryNow(options?: {
  includeNonFinished?: boolean;
  persist?: boolean;
  reason?: string;
}): Promise<StatsIndex> {
  const idx = await rebuildStatsFromHistory({
    includeNonFinished: options?.includeNonFinished,
    persist: options?.persist,
  });

  clearStatsIndexDirty();
  dispatchStatsIndexUpdated({
    reason: options?.reason || "refresh-now",
    rebuiltAt: idx?.rebuiltAt || Date.now(),
    totals: idx?.totals || null,
  });

  return idx;
}

export function scheduleStatsIndexRefresh(options?: {
  includeNonFinished?: boolean;
  persist?: boolean;
  debounceMs?: number;
  reason?: string;
}): Promise<StatsIndex> {
  const reason = options?.reason || "scheduled-refresh";
  markStatsIndexDirty(reason);

  // ✅ Perf: no more global/background rebuild here.
  // We only mark the cache dirty. Actual rebuild happens on-demand
  // when the user opens a stats screen or explicitly requests it.
  const cachedPromise = loadStatsIndex().then((cached) => cached || createEmptyStatsIndex(!!options?.includeNonFinished));
  __statsRefreshPromise = cachedPromise;
  return cachedPromise;
}

export function cancelScheduledStatsIndexRefresh(): void {
  if (__statsRefreshTimer) {
    clearTimeout(__statsRefreshTimer);
    __statsRefreshTimer = null;
  }
}

export async function getOrRebuildStatsIndex(options?: {
  includeNonFinished?: boolean;
  persist?: boolean;
  force?: boolean;
}): Promise<StatsIndex> {
  if (!options?.force && !isStatsIndexDirty()) {
    const cached = await loadStatsIndex();
    if (cached) return cached;
  }
  return rebuildStatsFromHistory(options);
}

export async function rebuildStatsFromHistory(options?: {
  includeNonFinished?: boolean;
  persist?: boolean;
}): Promise<StatsIndex> {
  const includeNonFinished = !!options?.includeNonFinished;
  const persist = options?.persist !== false;

  // ✅ TDZ / cycle break:
  // rebuildStatsFromHistory <-> history created a runtime import cycle.
  // We resolve History lazily here so the module graph is fully initialized
  // before accessing the History object.
  const { History } = await import("../history");

  const list = includeNonFinished
    ? await History.list()
    : (await History.listFinished?.()) ?? (await History.list());

  const idx = createEmptyStatsIndex(includeNonFinished);
  idx.rebuiltAt = Date.now();
  idx.meta = {
    source: "history-rebuild",
    rowsScanned: Array.isArray(list) ? list.length : 0,
    includeNonFinished,
    historyUpdatedAt: computeHistoryUpdatedAt(Array.isArray(list) ? list : []),
  };

  const rows: any[] = Array.isArray(list) ? list : [];
  for (const rec of rows) {
    const ts = toTs(rec?.updatedAt) ?? toTs(rec?.createdAt) ?? undefined;
    const rawPayload = rec?.payload ?? rec?.snapshot ?? rec?.data ?? null;
    const payload = normalizeMatchForStats(rec, rawPayload);
    const status = rec?.status;
    const mode = normalizeGameKey(rec, payload);

    bumpMode(idx, mode, status, ts);

    idx.totals.matches += 1;
    const st = (status || "").toLowerCase();
    if (st.includes("finish")) idx.totals.finished += 1;
    else if (st.includes("save")) idx.totals.saved += 1;
    else idx.totals.inProgress += 1;

    idx.matchIdsByMode[mode] = idx.matchIdsByMode[mode] || [];
    idx.matchIdsByMode[mode].push(String(rec?.id || ""));

    const extractor = extractors[mode];
    if (extractor) {
      try {
        extractor({ rec, payload, mode, ts, idx });
      } catch {
        // ne jamais casser le rebuild stats
      }
    }
  }

  if (persist) await saveStatsIndex(idx);
  clearStatsIndexDirty();
  return idx;
}
