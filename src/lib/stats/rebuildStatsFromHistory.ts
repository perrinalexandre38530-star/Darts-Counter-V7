// src/lib/stats/rebuildStatsFromHistory.ts
// ============================================
// Rebuild STATS depuis l'Historique (source de vérité)
// - Ne dépend PAS de Supabase
// - Robuste payload compressé / legacy
// - Conçu pour être étendu mode par mode via "extractors"
// ============================================

import { History } from "../history";

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
  game?: string; // parfois présent
  mode?: string; // parfois présent
  payload?: any; // decoded
  payloadCompressed?: string; // legacy
};

export type PlayerAgg = {
  playerId: string;
  name?: string;
  matches: number;
  wins: number;
  losses: number;

  // X01-like
  dartsThrown?: number;
  pointsScored?: number;

  // Generic
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
  // brute ids utiles (pour “Mes fléchettes”, “Comparateur”, etc.)
  matchIdsByMode: Record<GameKey, string[]>;
};

// ----------------------------
// Stockage local des stats
// ----------------------------
const STATS_KEY = "dc-stats-index-v1";
const STATS_VERSION = 1;

export function loadStatsIndex(): StatsIndex | null {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== STATS_VERSION) return null;
    return parsed as StatsIndex;
  } catch {
    return null;
  }
}

export function saveStatsIndex(idx: StatsIndex) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(idx));
  } catch {
    // ignore (private mode / quota)
  }
}

// ----------------------------
// Helpers
// ----------------------------
function toTs(v: any): number | undefined {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Date.parse(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function normalizeGameKey(rec: any, payload: any): GameKey {
  const g = (rec?.game || rec?.mode || payload?.game || payload?.mode || payload?.kind || "").toString().toLowerCase();

  // heuristiques tolérantes
  if (g.includes("x01") || g.includes("301") || g.includes("501")) return "x01";
  if (g.includes("cricket")) return "cricket";
  if (g.includes("killer")) return "killer";
  if (g.includes("golf")) return "golf";
  if (g.includes("shanghai")) return "shanghai";
  if (g.includes("territ")) return "territories";
  if (g.includes("scram")) return "scram";
  if (g.includes("batard") || g.includes("bastard")) return "batard";

  // fallback : si payload ressemble à X01
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
  else {
    // si pas clair, on range dans finished si payload a winner, sinon inProgress
    m.inProgress += 1;
  }

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
    lastMatchAt: undefined,
  };

  // incréments safe
  if (patch.name) p.name = patch.name;

  if (typeof patch.matches === "number") p.matches += patch.matches;
  if (typeof patch.wins === "number") p.wins += patch.wins;
  if (typeof patch.losses === "number") p.losses += patch.losses;

  if (typeof patch.dartsThrown === "number") p.dartsThrown = (p.dartsThrown || 0) + patch.dartsThrown;
  if (typeof patch.pointsScored === "number") p.pointsScored = (p.pointsScored || 0) + patch.pointsScored;

  if (ts && (!p.lastMatchAt || ts > p.lastMatchAt)) p.lastMatchAt = ts;

  idx.byPlayer[playerId] = p;
}

// ----------------------------
// Extractors (mode -> lecture payload)
// -> ici on met du "best effort" qui ne casse jamais.
// -> tu pourras raffiner ensuite (best checkout, avg 3 darts, etc.)
// ----------------------------
type Extractor = (args: {
  rec: any;
  payload: any;
  mode: GameKey;
  ts?: number;
  idx: StatsIndex;
}) => void;

const extractors: Partial<Record<GameKey, Extractor>> = {
  x01: ({ payload, ts, idx }) => {
    // On cherche une structure de joueurs tolérante
    const players =
      payload?.players ||
      payload?.state?.players ||
      payload?.snapshot?.players ||
      payload?.match?.players ||
      [];

    const winnerId =
      payload?.winnerId ||
      payload?.state?.winnerId ||
      payload?.result?.winnerId ||
      payload?.winner?.id;

    // Darts/points : selon formats, on tente plusieurs champs
    for (const pl of Array.isArray(players) ? players : []) {
      const pid = (pl?.id || pl?.playerId || pl?.uid || pl?.profileId || "").toString();
      if (!pid) continue;

      const name = pl?.name || pl?.displayName;

      // darts thrown (visits*3 ou dartsTotal)
      const dartsThrown =
        pl?.dartsThrown ??
        pl?.darts ??
        pl?.stats?.dartsThrown ??
        pl?.stats?.dartsTotal ??
        undefined;

      // points scored
      const pointsScored =
        pl?.pointsScored ??
        pl?.scored ??
        pl?.stats?.pointsScored ??
        pl?.stats?.points ??
        undefined;

      const isWinner = winnerId && pid === String(winnerId);

      bumpPlayer(
        idx,
        pid,
        {
          name,
          matches: 1,
          wins: isWinner ? 1 : 0,
          losses: winnerId ? (isWinner ? 0 : 1) : 0,
          dartsThrown: typeof dartsThrown === "number" ? dartsThrown : 0,
          pointsScored: typeof pointsScored === "number" ? pointsScored : 0,
        },
        ts
      );
    }
  },

  // pour l’instant on indexe juste matches / players présents
  killer: ({ payload, ts, idx }) => {
    const players =
      payload?.players ||
      payload?.state?.players ||
      payload?.summary?.players ||
      [];
    const winnerId =
      payload?.winnerId ||
      payload?.state?.winnerId ||
      payload?.result?.winnerId ||
      payload?.summary?.winnerId ||
      null;

    for (const pl of Array.isArray(players) ? players : []) {
      const pid = (pl?.id || pl?.playerId || pl?.uid || "").toString();
      if (!pid) continue;
      const kills =
        Number(pl?.kills ?? pl?.stats?.kills ?? pl?.special?.kills ?? 0) || 0;

      bumpPlayer(
        idx,
        pid,
        {
          name: pl?.name,
          matches: 1,
          wins: winnerId && String(winnerId) === pid ? 1 : 0,
          losses: winnerId && String(winnerId) !== pid ? 1 : 0,
        },
        ts
      );

      (idx.byPlayer[pid] as any).killer = {
        kills: Number(((idx.byPlayer[pid] as any).killer?.kills || 0) + kills) || 0,
      };
    }
  },

  cricket: ({ payload, ts, idx }) => {
    const players =
      payload?.players ||
      payload?.state?.players ||
      payload?.summary?.players ||
      payload?.stats?.players ||
      [];

    const winnerId =
      payload?.winnerId ||
      payload?.state?.winnerId ||
      payload?.result?.winnerId ||
      payload?.summary?.winnerId ||
      null;

    for (const pl of Array.isArray(players) ? players : []) {
      const pid = (pl?.id || pl?.playerId || pl?.uid || pl?.profileId || "").toString();
      if (!pid) continue;

      const marksObj = pl?.marks && typeof pl.marks === "object" ? pl.marks : null;
      const marksTotal =
        Number(pl?.marksTotal ?? pl?.stats?.marksTotal ?? pl?.special?.marksTotal ?? 0) ||
        (marksObj
          ? Object.values(marksObj).reduce((a: any, b: any) => (Number(a) || 0) + (Number(b) || 0), 0)
          : 0);

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

      const pointsScored =
        Number(pl?.score ?? pl?.points ?? pl?.stats?.score ?? 0) || 0;

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
        },
        ts
      );

      const cur: any = (idx.byPlayer[pid] as any).cricket || {
        marks: 0,
        hits: 0,
        darts: 0,
        score: 0,
      };

      cur.marks += marksTotal;
      cur.hits += hits;
      cur.darts += dartsThrown;
      cur.score += pointsScored;
      (idx.byPlayer[pid] as any).cricket = cur;
    }
  },

  golf: ({ rec, payload, ts, idx }) => {
    const players =
      payload?.players ||
      rec?.players ||
      payload?.summary?.players ||
      [];

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

      bumpPlayer(idx, pid, { matches: 1, dartsThrown, pointsScored: total }, ts);

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
    const stats =
      payload?.statsShanghai ||
      payload?.stats ||
      payload?.summary?.statsShanghai ||
      {};

    const rounds = stats?.rounds || payload?.rounds || [];
    for (const r of Array.isArray(rounds) ? rounds : []) {
      const pid = String(r?.playerId || r?.id || "");
      if (!pid) continue;
      const score = Number(r?.score || 0) || 0;
      bumpPlayer(idx, pid, { matches: 1 }, ts);
      const cur: any = (idx.byPlayer[pid] as any).shanghai || { total: 0, min: undefined, max: 0 };
      cur.total += score;
      cur.min = cur.min == null ? score : Math.min(cur.min, score);
      cur.max = Math.max(cur.max || 0, score);
      (idx.byPlayer[pid] as any).shanghai = cur;
    }
  },

  territories: ({ payload, ts, idx }) => {
    const data = payload || {};
    const sum = (arr: any[]) => (Array.isArray(arr) ? arr.reduce((a: number, b: any) => a + (Number(b) || 0), 0) : 0);

    const players =
      payload?.players ||
      payload?.state?.players ||
      payload?.summary?.players ||
      [];

    for (const pl of Array.isArray(players) ? players : []) {
      const pid = String(pl?.id || pl?.playerId || pl?.profileId || "");
      if (!pid) continue;

      bumpPlayer(idx, pid, { name: pl?.name, matches: 1 }, ts);

      const cur: any = (idx.byPlayer[pid] as any).territories || {
        captured: 0, darts: 0, steals: 0, lost: 0
      };
      cur.captured += sum(data?.captured ?? pl?.captured);
      cur.darts += sum(data?.darts ?? pl?.darts);
      cur.steals += sum(data?.steals ?? pl?.steals);
      cur.lost += sum(data?.lost ?? pl?.lost);
      (idx.byPlayer[pid] as any).territories = cur;
    }
  },
};

// ----------------------------
// Rebuild principal
// ----------------------------
export async function rebuildStatsFromHistory(options?: {
  // si true : inclut in_progress/saved, sinon finished only
  includeNonFinished?: boolean;
  persist?: boolean;
}): Promise<StatsIndex> {
  const includeNonFinished = !!options?.includeNonFinished;
  const persist = options?.persist !== false;

  // ⚠️ Source de vérité : History
  const list = includeNonFinished
    ? await History.list() // tout
    : await History.listFinished?.() ?? await History.list(); // fallback si listFinished n'existe pas

  const idx: StatsIndex = {
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
  };

  const rows: any[] = Array.isArray(list) ? list : [];
  for (const rec of rows) {
    const ts = toTs(rec?.updatedAt) ?? toTs(rec?.createdAt) ?? undefined;
    const payload = rec?.payload ?? rec?.snapshot ?? rec?.data ?? null; // robust
    const status = rec?.status;

    const mode = normalizeGameKey(rec, payload);

    bumpMode(idx, mode, status, ts);

    // totals
    idx.totals.matches += 1;
    const st = (status || "").toLowerCase();
    if (st.includes("finish")) idx.totals.finished += 1;
    else if (st.includes("save")) idx.totals.saved += 1;
    else idx.totals.inProgress += 1;

    // index match id
    idx.matchIdsByMode[mode] = idx.matchIdsByMode[mode] || [];
    idx.matchIdsByMode[mode].push(String(rec?.id || ""));

    // extractor mode
    const extractor = extractors[mode];
    if (extractor) {
      try {
        extractor({ rec, payload, mode, ts, idx });
      } catch {
        // jamais casser le rebuild
      }
    }
  }

  if (persist) saveStatsIndex(idx);
  return idx;
}
