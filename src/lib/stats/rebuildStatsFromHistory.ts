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
    const players = payload?.players || payload?.state?.players || [];
    for (const pl of Array.isArray(players) ? players : []) {
      const pid = (pl?.id || pl?.playerId || pl?.uid || "").toString();
      if (!pid) continue;
      bumpPlayer(idx, pid, { name: pl?.name, matches: 1 }, ts);
    }
  },

  cricket: ({ payload, ts, idx }) => {
    const players = payload?.players || payload?.state?.players || [];
    for (const pl of Array.isArray(players) ? players : []) {
      const pid = (pl?.id || pl?.playerId || pl?.uid || "").toString();
      if (!pid) continue;
      bumpPlayer(idx, pid, { name: pl?.name, matches: 1 }, ts);
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
