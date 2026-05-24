// src/lib/stats/rebuildStatsFromHistory.ts
// ============================================
// Rebuild STATS depuis l'Historique (source de vérité)
// - Persistance principale en IndexedDB (KV), plus robuste que localStorage
// - Fallback legacy localStorage conservé pour migration douce
// - Prépare un vrai stats_index centralisé pour éviter les stats vides
// ============================================

import { delKV, getKV, setKV } from "../storage";
import { normalizeMatchForStats } from "../matchCompactCodec";
import { computeBabyFootRichStats } from "../babyfootRichStats";

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
  | "battle_royale"
  | "warfare"
  | "five_lives"
  | "scram"
  | "capital"
  | "batard"
  | "babyfoot"
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
      battle_royale: { mode: "battle_royale", matches: 0, finished: 0, inProgress: 0, saved: 0 },
      warfare: { mode: "warfare", matches: 0, finished: 0, inProgress: 0, saved: 0 },
      five_lives: { mode: "five_lives", matches: 0, finished: 0, inProgress: 0, saved: 0 },
      scram: { mode: "scram", matches: 0, finished: 0, inProgress: 0, saved: 0 },
      capital: { mode: "capital", matches: 0, finished: 0, inProgress: 0, saved: 0 },
      batard: { mode: "batard", matches: 0, finished: 0, inProgress: 0, saved: 0 },
      babyfoot: { mode: "babyfoot", matches: 0, finished: 0, inProgress: 0, saved: 0 },
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
      battle_royale: [],
      warfare: [],
      five_lives: [],
      scram: [],
      capital: [],
      batard: [],
      babyfoot: [],
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
  const parts = [
    rec?.sport, rec?.game, rec?.mode, rec?.kind, rec?.variant, rec?.variantId, rec?.summary?.mode, rec?.summary?.variantId,
    payload?.game, payload?.mode, payload?.kind, payload?.variant, payload?.variantId, payload?.config?.mode, payload?.config?.variantId, payload?.summary?.mode, payload?.summary?.variantId,
  ];
  const g = parts.filter((v) => v !== undefined && v !== null).map((v) => String(v).toLowerCase()).join(" ");

  if (g.includes("babyfoot") || g.includes("baby-foot") || g.includes("foosball")) return "babyfoot";
  if (payload?.teamAProfileIds || payload?.teamBProfileIds || payload?.summary?.teamA || payload?.summary?.teamB) return "babyfoot";

  if (g.includes("x01") || g.includes("301") || g.includes("501")) return "x01";

  // Variantes Cricket : elles doivent alimenter le même tableau de stats Cricket.
  if (g.includes("cricket") || g.includes("cut_throat") || g.includes("cut-throat") || g.includes("cut throat") || g.includes("enculette") || g.includes("vache")) return "cricket";

  if (g.includes("killer")) return "killer";
  if (g.includes("golf")) return "golf";
  if (g.includes("shanghai")) return "shanghai";
  if (g.includes("territ")) return "territories";
  if (g.includes("battle") || g.includes("royale")) return "battle_royale";
  if (g.includes("warfare")) return "warfare";
  if (g.includes("five_lives") || g.includes("five lives") || g.includes("5 vies") || g.includes("cinq vies")) return "five_lives";
  if (g.includes("scram")) return "scram";
  if (g.includes("capital")) return "capital";
  if (g.includes("batard") || g.includes("bastard") || g.includes("bâtard")) return "batard";
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

function sumNumbers(value: any): number {
  if (Array.isArray(value)) return value.reduce((a, b) => a + (Number(b) || 0), 0);
  if (value && typeof value === "object") return Object.values(value).reduce((a: any, b: any) => (Number(a) || 0) + (Number(b) || 0), 0) as number;
  return Number(value || 0) || 0;
}

function extractGenericDartsMode(mode: GameKey, payload: any, ts: number | undefined, idx: StatsIndex): void {
  const pools = [
    payload?.stats?.players,
    payload?.summary?.perPlayer,
    payload?.summary?.players,
    payload?.players,
    payload?.state?.players,
  ];
  const byId = new Map<string, any>();
  for (const pool of pools) {
    if (!Array.isArray(pool)) continue;
    for (const row of pool) {
      const pid = String(row?.id || row?.playerId || row?.profileId || row?.uid || "");
      if (!pid) continue;
      byId.set(pid, { ...(byId.get(pid) || {}), ...(row || {}), id: pid, playerId: pid });
    }
  }

  const winnerId = payload?.winnerId || payload?.state?.winnerId || payload?.result?.winnerId || payload?.summary?.winnerId || null;
  for (const pl of byId.values()) {
    const pid = String(pl?.id || pl?.playerId || pl?.profileId || pl?.uid || "");
    if (!pid) continue;
    const points = Number(pl?.points ?? pl?.score ?? pl?.totalScore ?? pl?.capital ?? pl?.finalCapital ?? 0) || 0;
    const dartsThrown = Number(pl?.dartsThrown ?? pl?.darts ?? pl?.totalThrows ?? 0) || 0;
    const bestVisit = Number(pl?.bestVisit ?? pl?.bestRound ?? pl?.bestAction ?? pl?.validHits ?? pl?.captures ?? pl?.kills ?? points ?? 0) || 0;
    const isWinner = !!winnerId && String(winnerId) === pid;
    bumpPlayer(idx, pid, {
      name: pl?.name || pl?.displayName,
      matches: 1,
      wins: isWinner ? 1 : 0,
      losses: winnerId && !isWinner ? 1 : 0,
      dartsThrown,
      pointsScored: points,
      bestVisit,
      bestCheckout: Number(pl?.bestCheckout ?? 0) || 0,
      buckets: makeVisitBuckets(bestVisit || points),
    }, ts);

    const cur: any = (idx.byPlayer[pid] as any)[mode] || {
      points: 0, darts: 0, wins: 0, captures: 0, steals: 0, kills: 0, friendlyKills: 0,
      fails: 0, validHits: 0, rounds: 0, advances: 0, livesLeft: 0, lostLives: 0,
      marks: 0, closed: 0, penalties: 0, success: 0,
    };
    cur.points += points;
    cur.darts += dartsThrown;
    cur.wins += isWinner ? 1 : 0;
    cur.captures += Number(pl?.captures ?? pl?.captured ?? pl?.territories ?? pl?.owned ?? 0) || 0;
    cur.steals += Number(pl?.steals ?? pl?.stolen ?? 0) || 0;
    cur.kills += Number(pl?.kills ?? pl?.eliminations ?? 0) || 0;
    cur.friendlyKills += Number(pl?.friendlyKills ?? pl?.friendlyFire ?? pl?.teamKills ?? 0) || 0;
    cur.fails += Number(pl?.fails ?? pl?.misses ?? pl?.penalties ?? 0) || 0;
    cur.validHits += Number(pl?.validHits ?? pl?.hitsTotal ?? pl?.success ?? pl?.successes ?? 0) || 0;
    cur.rounds += Number(pl?.rounds ?? payload?.summary?.rounds ?? 0) || 0;
    cur.advances += Number(pl?.advances ?? 0) || 0;
    cur.livesLeft += Number(pl?.livesLeft ?? pl?.remainingLives ?? pl?.lives ?? 0) || 0;
    cur.lostLives += Number(pl?.lostLives ?? pl?.damageTaken ?? pl?.deaths ?? 0) || 0;
    cur.marks += Number(pl?.totalMarks ?? pl?.marksTotal ?? 0) || sumNumbers(pl?.marks);
    cur.closed += Number(pl?.closed ?? pl?.closes ?? pl?.closedNumbers ?? 0) || 0;
    cur.penalties += Number(pl?.penalties ?? 0) || 0;
    cur.success += Number(pl?.success ?? pl?.successes ?? pl?.validHits ?? 0) || 0;
    (idx.byPlayer[pid] as any)[mode] = cur;
  }
}

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


  babyfoot: ({ rec, payload, ts, idx }) => {
    const rich = computeBabyFootRichStats(payload || rec || {});
    const teamAIds = Array.isArray(payload?.teamAProfileIds)
      ? payload.teamAProfileIds.map((x: any) => String(x)).filter(Boolean)
      : Array.isArray(payload?.summary?.teamAProfileIds)
      ? payload.summary.teamAProfileIds.map((x: any) => String(x)).filter(Boolean)
      : [];
    const teamBIds = Array.isArray(payload?.teamBProfileIds)
      ? payload.teamBProfileIds.map((x: any) => String(x)).filter(Boolean)
      : Array.isArray(payload?.summary?.teamBProfileIds)
      ? payload.summary.teamBProfileIds.map((x: any) => String(x)).filter(Boolean)
      : [];

    const players = Array.isArray(payload?.players) ? payload.players : Array.isArray(rec?.players) ? rec.players : [];
    const nameById = new Map<string, string>();
    for (const pl of players) {
      const pid = String(pl?.id || pl?.playerId || pl?.profileId || pl?.uid || "");
      if (pid) nameById.set(pid, String(pl?.name || pl?.displayName || ""));
    }

    const scoreA = Number(rich?.teamA?.score ?? rich?.teamA?.goals ?? 0) || 0;
    const scoreB = Number(rich?.teamB?.score ?? rich?.teamB?.goals ?? 0) || 0;
    const winnerSide = scoreA === scoreB ? null : scoreA > scoreB ? "A" : "B";

    const addSide = (ids: string[], side: "A" | "B") => {
      const mine: any = side === "A" ? rich.teamA : rich.teamB;
      const opp: any = side === "A" ? rich.teamB : rich.teamA;
      for (const pid of ids) {
        if (!pid) continue;
        const isWinner = winnerSide === side;
        bumpPlayer(idx, pid, {
          name: nameById.get(pid),
          matches: 1,
          wins: isWinner ? 1 : 0,
          losses: winnerSide && !isWinner ? 1 : 0,
          pointsScored: Number(mine?.goals ?? mine?.score ?? 0) || 0,
          bestVisit: Number(mine?.longestRun ?? mine?.goals ?? mine?.score ?? 0) || 0,
          buckets: {
            goals: Number(mine?.goals ?? 0) || 0,
            conceded: Number(mine?.goalsConceded ?? opp?.goals ?? 0) || 0,
            gamelle: Number(mine?.gamelle ?? 0) || 0,
            peche: Number(mine?.peche ?? 0) || 0,
            demi: Number(mine?.demi ?? 0) || 0,
            pissette: Number(mine?.pissette ?? 0) || 0,
          },
        }, ts);

        const cur: any = (idx.byPlayer[pid] as any).babyfoot || {
          matches: 0, wins: 0, goals: 0, conceded: 0, sets: 0, legs: 0, gamelle: 0,
          peche: 0, pecheOff: 0, pecheDef: 0, demi: 0, demiBonus: 0, pissette: 0,
          pissetteValid: 0, pissetteRefused: 0, csc: 0, goalAv: 0, goalDef: 0, goalGb: 0,
          penalties: 0, cleanSheets: 0, longestRun: 0, goalDiff: 0,
        };
        cur.matches += 1;
        cur.wins += isWinner ? 1 : 0;
        cur.goals += Number(mine?.goals ?? 0) || 0;
        cur.conceded += Number(mine?.goalsConceded ?? opp?.goals ?? 0) || 0;
        cur.sets += Number(mine?.sets ?? 0) || 0;
        cur.legs += Number(mine?.legs ?? 0) || 0;
        cur.gamelle += Number(mine?.gamelle ?? 0) || 0;
        cur.peche += Number(mine?.peche ?? 0) || 0;
        cur.pecheOff += Number(mine?.pecheOff ?? 0) || 0;
        cur.pecheDef += Number(mine?.pecheDef ?? 0) || 0;
        cur.demi += Number(mine?.demi ?? 0) || 0;
        cur.demiBonus += Number(mine?.demiBonus ?? 0) || 0;
        cur.pissette += Number(mine?.pissette ?? 0) || 0;
        cur.pissetteValid += Number(mine?.pissetteValid ?? 0) || 0;
        cur.pissetteRefused += Number(mine?.pissetteRefused ?? 0) || 0;
        cur.csc += Number(mine?.csc ?? 0) || 0;
        cur.goalAv += Number(mine?.goalAv ?? 0) || 0;
        cur.goalDef += Number(mine?.goalDef ?? 0) || 0;
        cur.goalGb += Number(mine?.goalGb ?? 0) || 0;
        cur.penalties += Number(mine?.penalties ?? 0) || 0;
        cur.cleanSheets += Number(mine?.goalsConceded ?? opp?.goals ?? 0) === 0 ? 1 : 0;
        cur.longestRun = Math.max(Number(cur.longestRun || 0) || 0, Number(mine?.longestRun ?? 0) || 0);
        cur.goalDiff += Number(mine?.goalDiff ?? ((mine?.goals || 0) - (opp?.goals || 0))) || 0;
        (idx.byPlayer[pid] as any).babyfoot = cur;
      }
    };

    addSide(teamAIds, "A");
    addSide(teamBIds, "B");
  },

  territories: ({ payload, ts, idx, mode }) => extractGenericDartsMode(mode, payload, ts, idx),

  battle_royale: ({ payload, ts, idx, mode }) => extractGenericDartsMode(mode, payload, ts, idx),
  warfare: ({ payload, ts, idx, mode }) => extractGenericDartsMode(mode, payload, ts, idx),
  five_lives: ({ payload, ts, idx, mode }) => extractGenericDartsMode(mode, payload, ts, idx),
  scram: ({ payload, ts, idx, mode }) => extractGenericDartsMode(mode, payload, ts, idx),
  capital: ({ payload, ts, idx, mode }) => extractGenericDartsMode(mode, payload, ts, idx),
  batard: ({ payload, ts, idx, mode }) => extractGenericDartsMode(mode, payload, ts, idx),
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
  // SOURCE UNIQUE + anti-cache fantôme : les écrans stats doivent refléter l'historique
  // réellement présent maintenant, pas un ancien dc_stats_index conservé en IDB/localStorage.
  // Le rebuild est déclenché à l'ouverture des écrans stats/Home, pas en tâche de fond.
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
  for (const lightRec of rows) {
    let rec: any = lightRec;
    try {
      const id = String(lightRec?.matchId ?? lightRec?.id ?? "").trim();
      if (id && typeof (History as any)?.get === "function") {
        rec = ((await (History as any).get(id)) as any) || lightRec;
      }
    } catch {
      rec = lightRec;
    }
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
