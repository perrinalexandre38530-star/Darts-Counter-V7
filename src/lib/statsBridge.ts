// @ts-nocheck
// ============================================
// src/lib/statsBridge.ts
// ✅ PONT UNIQUE DE STATS (V5.3) — "buildStatsIndex()"
// Objectif : UN SEUL câblage qui alimente StatsHub / Leaderboards / Profils / Historique
//
// Expose (nouveau) :
//   - getX01ProfileStats(profileId, range, source)
//   - getCricketProfileStats(profileId, range, source)
//   - getKillerProfileStats(profileId, range, source)
//   - getShanghaiProfileStats(profileId, range, source)
//   - getGlobalStats(range, source)
//   - getLeaderboards({ mode, metric, range, source, minGames })
//
// Compat (ancien UI) :
//   - StatsBridge.makeLeg / commitLegAndAccumulate / makeMatch / commitMatchAndSave
//   - getBasicProfileStats / getMergedProfilesStats / getProfileQuickStats / getBasicProfileStatsAsync
//   - getCricketProfileStats (alias legacy) / getX01MultiLegsSetsForProfile
//
// Notes :
// - Index basé sur History.list() (IDB). On normalise TOUT ce qu'on peut :
//   * payload string (base64+gzip / json / LZString global)
//   * summary / payload.summary / liveStatsByPlayer / players arrays
// - "source" (local/online/training/all) : filtrage best-effort selon les champs présents.
//   Si tu n'as pas encore de marquage source, "all" == "local".
// ============================================

import { History } from "./history";
import type { SavedMatch } from "./history";
import {
  aggregateCricketProfileStats,
  type CricketLegStats,
  type CricketProfileStats,
} from "./cricketStats";

/* ============================================================
   Types publics
============================================================ */

export type Seg = { v: number; mult?: 1 | 2 | 3 };

export type Visit = {
  p: string; // playerId
  segments?: Seg[];
  score?: number;
  bust?: boolean;
  isCheckout?: boolean;
  remainingAfter?: number;
  ts?: number;
};

export type PlayerLite = {
  id: string;
  name?: string;
  avatarDataUrl?: string | null;
};

export type BasicProfileStats = {
  games: number;
  darts: number;
  avg3: number;
  bestVisit: number;
  bestCheckout: number;
  wins: number;

  coTotal?: number;
  winRate?: number;
};

export type RangeKey = "today" | "week" | "month" | "year" | "all" | "archives";
export type SourceKey = "local" | "online" | "training" | "all";

/* X01 avancé (profil) */
export type X01ProfileStats = BasicProfileStats & {
  points: number;
  visits: number;
  h60: number;
  h100: number;
  h140: number;
  h180: number;
  bust: number;
  miss: number;
  doubles: number;
  triples: number;
  bulls: number;
  dbull: number;
  bestFinish?: number; // alias bestCheckout si ton moteur renvoie un finish
};

/* Killer */
export type KillerProfileStats = {
  matches: number;
  wins: number;
  winRate: number;
  kills: number;
  hitsTotal: number;
  lastMatchAt?: number;
};

/* Shanghai */
export type ShanghaiProfileStats = {
  matches: number;
  wins: number;
  winRate: number;
  bestScore: number; // si dispo
  hitsTotal: number; // si dispo
  lastMatchAt?: number;
};

/* Global */
export type GlobalStats = {
  matches: number;
  finished: number;
  inProgress: number;
  byMode: Record<string, number>;
};

export type LeaderboardMetric =
  | "avg3"
  | "winRate"
  | "wins"
  | "games"
  | "bestVisit"
  | "bestCheckout"
  | "h180"
  | "precision"; // cricket

export type LeaderboardMode = "x01" | "cricket" | "killer" | "shanghai";

/* ============================================================
   QUICK STATS legacy (cache localStorage)
============================================================ */

const QUICK_STATS_KEY = "dc-quick-stats";

type QuickStatsEntry = BasicProfileStats & {
  points?: number;
  totalScore?: number;
};

/* ============================================================
   Utils
============================================================ */

function nowTs() {
  return Date.now();
}

function N(x: any, d = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : d;
}

function getId(v: any): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  return String(v.id || v.playerId || v.profileId || v._id || "");
}

function getName(v: any): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  return String(v.name || v.displayName || v.username || v.label || "");
}

function safeLower(s: any) {
  return String(s || "").toLowerCase();
}

function dartValue(seg?: Seg) {
  if (!seg) return 0;
  if (seg.v === 25 && seg.mult === 2) return 50;
  return (seg.v || 0) * (seg.mult || 1);
}

function pct(n: number, d: number) {
  return d > 0 ? Math.round((n / d) * 1000) / 10 : 0;
}

function startOf(period: RangeKey) {
  const now = new Date();
  if (period === "today") {
    now.setHours(0, 0, 0, 0);
    return now.getTime();
  }
  if (period === "week") {
    const d = (now.getDay() + 6) % 7; // monday start
    now.setDate(now.getDate() - d);
    now.setHours(0, 0, 0, 0);
    return now.getTime();
  }
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  if (period === "year") return new Date(now.getFullYear(), 0, 1).getTime();
  if (period === "archives") return 0;
  return 0; // "all"
}

function inRange(ts: number, range: RangeKey) {
  const t = ts || nowTs();
  if (range === "all") return true;
  if (range === "archives") return t < startOf("year");
  return t >= startOf(range);
}

/* ============================================================
   Décodage payload (base64+gzip / json / LZString global)
============================================================ */

async function decodePayload(raw: any): Promise<any | null> {
  if (!raw || typeof raw !== "string") return null;

  const tryParse = (s: any) => {
    if (typeof s !== "string") return null;
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  // 0) JSON string direct
  const direct = tryParse(raw);
  if (direct) return direct;

  // 1) base64 -> gzip -> json
  try {
    const bin = atob(raw);
    const buf = Uint8Array.from(bin, (c) => c.charCodeAt(0));

    const DS: any = (window as any).DecompressionStream;
    if (typeof DS === "function") {
      const ds = new DS("gzip");
      const stream = new Blob([buf]).stream().pipeThrough(ds);
      const resp = new Response(stream);
      return await resp.json();
    }

    // fallback : json base64
    const parsed = tryParse(bin);
    if (parsed) return parsed;
  } catch {
    // ignore
  }

  // 2) LZString global (si dispo)
  try {
    const LZ: any = (window as any).LZString;
    if (LZ) {
      const s1 = typeof LZ.decompressFromUTF16 === "function" ? LZ.decompressFromUTF16(raw) : null;
      const p1 = tryParse(s1);
      if (p1) return p1;

      const s2 = typeof LZ.decompressFromBase64 === "function" ? LZ.decompressFromBase64(raw) : null;
      const p2 = tryParse(s2);
      if (p2) return p2;

      const s3 = typeof LZ.decompress === "function" ? LZ.decompress(raw) : null;
      const p3 = tryParse(s3);
      if (p3) return p3;
    }
  } catch {
    // ignore
  }

  return null;
}

/* ============================================================
   Normalisation d'un SavedMatch (unifie kind/mode/summary/players)
============================================================ */

type NormalizedMatch = {
  id: string;
  kind: string; // x01 / cricket / killer / shanghai / ...
  mode: string; // idem (lower)
  source: SourceKey; // local/online/training/all (best-effort)
  status: "finished" | "in_progress";
  createdAt: number;
  updatedAt: number;
  winnerId: string | null;
  players: PlayerLite[];
  summary: any;
  payloadObj: any | null; // payload décodé si payload string
  raw: SavedMatch;
};

function detectSource(rec: any): SourceKey {
  // best-effort : adapte si tu as déjà un marqueur
  const s =
    rec?.source ||
    rec?.origin ||
    rec?.meta?.source ||
    rec?.summary?.source ||
    rec?.payload?.source ||
    rec?.payload?.meta?.source ||
    "";
  const v = safeLower(s);
  if (v.includes("online")) return "online";
  if (v.includes("train")) return "training";
  if (v.includes("local")) return "local";
  return "local"; // par défaut tant que tu n'as pas de flag fiable
}

function detectKindMode(rec: any, decoded: any | null) {
  const k = safeLower(rec?.kind || rec?.variant || rec?.game || rec?.mode || "");
  const sMode = safeLower(rec?.summary?.mode || rec?.summary?.gameMode || rec?.payload?.mode || rec?.payload?.gameMode || "");
  const dMode = safeLower(decoded?.config?.mode || decoded?.game?.mode || decoded?.mode || decoded?.gameMode || "");

  // ordre de priorité : kind/variant connus, puis summary/payload, puis decoded
  let mode = dMode || sMode || k || "x01";
  let kind = k || mode || "x01";

  // normalisations simples
  if (kind === "leg") kind = "x01";
  if (mode === "leg") mode = "x01";

  // si ça contient un mot clé
  const blob = `${kind} ${mode} ${sMode} ${dMode}`;
  if (blob.includes("cricket")) return { kind: "cricket", mode: "cricket" };
  if (blob.includes("killer")) return { kind: "killer", mode: "killer" };
  if (blob.includes("shanghai")) return { kind: "shanghai", mode: "shanghai" };
  if (blob.includes("x01")) return { kind: "x01", mode: "x01" };

  return { kind, mode };
}

function detectStatus(rec: any, decoded: any | null): "finished" | "in_progress" {
  const raw = safeLower(rec?.status || "");
  if (raw === "finished") return "finished";
  if (raw === "inprogress" || raw === "in_progress") return "in_progress";

  // On décide "finished" seulement sur des marqueurs solides
  const s = rec?.summary || rec?.payload?.summary || {};
  const winnerId =
    rec?.winnerId ||
    s?.winnerId ||
    s?.result?.winnerId ||
    rec?.payload?.winnerId ||
    null;

  if (winnerId) return "finished";

  // certains moteurs stockent rankings ou finished explicitement
  if (s?.finished === true) return "finished";
  if (s?.result?.finished === true) return "finished";
  if (Array.isArray(s?.rankings) && s.rankings.length) return "finished";

  // decoded payload : même logique (pas "summary existe" => finished)
  const d = decoded || {};
  const dw =
    d?.winnerId ||
    d?.summary?.winnerId ||
    d?.result?.winnerId ||
    null;

  if (dw) return "finished";
  if (d?.summary?.finished === true) return "finished";
  if (d?.result?.finished === true) return "finished";
  if (Array.isArray(d?.rankings) && d.rankings.length) return "finished";

  return "in_progress";
}

function extractPlayers(rec: any, decoded: any | null): PlayerLite[] {
  const arr =
    (decoded?.config?.players && Array.isArray(decoded.config.players) ? decoded.config.players : null) ||
    (decoded?.players && Array.isArray(decoded.players) ? decoded.players : null) ||
    (rec?.players && Array.isArray(rec.players) ? rec.players : null) ||
    (rec?.summary?.players && Array.isArray(rec.summary.players) ? rec.summary.players : null) ||
    (rec?.payload?.players && Array.isArray(rec.payload.players) ? rec.payload.players : null) ||
    [];

  const out: PlayerLite[] = [];
  for (const p of arr) {
    const id = getId(p);
    if (!id) continue;
    out.push({ id, name: getName(p), avatarDataUrl: p?.avatarDataUrl ?? null });
  }
  // dédoublonne
  const seen = new Set<string>();
  return out.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}

function extractWinnerId(rec: any, decoded: any | null): string | null {
  const s = rec?.summary || rec?.payload?.summary || {};
  return (
    (rec?.winnerId ? String(rec.winnerId) : null) ||
    (s?.winnerId ? String(s.winnerId) : null) ||
    (s?.result?.winnerId ? String(s.result.winnerId) : null) ||
    (decoded?.summary?.winnerId ? String(decoded.summary.winnerId) : null) ||
    (decoded?.result?.winnerId ? String(decoded.result.winnerId) : null) ||
    null
  );
}

/* ============================================================
   Index de stats (cache mémoire + rebuild)
============================================================ */

type StatsIndex = {
  builtAt: number;
  rows: NormalizedMatch[];

  byProfile: Record<string, NormalizedMatch[]>;
  byMode: Record<string, NormalizedMatch[]>;
};

let _cache: StatsIndex | null = null;
let _cachePromise: Promise<StatsIndex> | null = null;

function applyFilters(rows: NormalizedMatch[], range: RangeKey, source: SourceKey) {
  return rows.filter((r) => {
    const ts = r.updatedAt || r.createdAt || 0;
    if (!inRange(ts, range)) return false;
    if (source === "all") return true;
    return r.source === source;
  });
}

async function normalizeRow(r: SavedMatch): Promise<NormalizedMatch | null> {
  if (!r) return null;

  const createdAt = N((r as any).createdAt, 0) || nowTs();
  const updatedAt = N((r as any).updatedAt, 0) || createdAt;

  let decoded: any | null = null;

  // payload peut être string compressée
  if (typeof (r as any).payload === "string") {
    decoded = await decodePayload((r as any).payload);
  } else if ((r as any).payload && typeof (r as any).payload === "object") {
    decoded = null; // déjà objet dans r.payload
  }

  const { kind, mode } = detectKindMode(r as any, decoded);
  const source = detectSource(r as any);
  const status = detectStatus(r as any, decoded);
  const players = extractPlayers(r as any, decoded);

  const summary =
    (r as any).summary ||
    (r as any).payload?.summary ||
    decoded?.summary ||
    decoded?.result ||
    decoded?.stats ||
    {};

  const winnerId = extractWinnerId(r as any, decoded);

  return {
    id: String((r as any).id || (r as any).matchId || ""),
    kind,
    mode,
    source,
    status,
    createdAt,
    updatedAt,
    winnerId,
    players,
    summary,
    payloadObj: decoded,
    raw: r,
  };
}

export async function buildStatsIndex(force = false): Promise<StatsIndex> {
  if (!force && _cache) return _cache;
  if (!force && _cachePromise) return _cachePromise;

  _cachePromise = (async () => {
    const raw = (await History.list()) as SavedMatch[];
    const arr = Array.isArray(raw) ? raw : [];

    const norm: NormalizedMatch[] = [];
    for (const r of arr) {
      try {
        const n = await normalizeRow(r);
        if (n && n.id) norm.push(n);
      } catch {
        // ignore
      }
    }

    // indexations
    const byProfile: Record<string, NormalizedMatch[]> = {};
    const byMode: Record<string, NormalizedMatch[]> = {};

    for (const m of norm) {
      const modeKey = m.mode || m.kind || "unknown";
      (byMode[modeKey] ||= []).push(m);

      for (const p of m.players) {
        (byProfile[p.id] ||= []).push(m);
      }
    }

    // tri desc
    norm.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
    for (const k of Object.keys(byProfile)) {
      byProfile[k].sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
    }
    for (const k of Object.keys(byMode)) {
      byMode[k].sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
    }

    _cache = { builtAt: nowTs(), rows: norm, byProfile, byMode };
    _cachePromise = null;
    return _cache;
  })();

  return _cachePromise;
}

export function clearStatsIndexCache() {
  _cache = null;
  _cachePromise = null;
}

/* ============================================================
   X01 — extraction tolérante stats joueur depuis un match
============================================================ */

function extractX01PlayerStatsFromMatch(m: NormalizedMatch, profileId: string) {
  const pid = String(profileId);

  // 1) liveStatsByPlayer (V3)
  const live = (m.raw as any)?.liveStatsByPlayer?.[pid];
  if (live) {
    const darts = N(live.dartsThrown, 0);
    const totalScore = N(live.totalScore, 0);
    const avg3 = darts > 0 ? (totalScore / darts) * 3 : 0;
    return {
      darts,
      points: totalScore,
      avg3,
      bestVisit: N(live.bestVisit, 0),
      bestCheckout: N(live.bestCheckout, 0),
      h60: N(live.h60, 0),
      h100: N(live.h100, 0),
      h140: N(live.h140, 0),
      h180: N(live.h180, 0),
      bust: N(live.bust, 0),
      miss: N(live.miss, 0),
      doubles: N(live.doubles, 0),
      triples: N(live.triples, 0),
      bulls: N(live.bulls, 0),
      dbull: N(live.dbull, 0),
    };
  }

  const s = m.summary || {};
  const per =
    s.perPlayer ||
    s.players ||
    (m.raw as any)?.payload?.summary?.perPlayer ||
    (m.raw as any)?.payload?.summary?.players ||
    [];

  const pstat =
    (Array.isArray(per) ? per.find((x: any) => String(x?.playerId || x?.id) === pid) : null) ||
    (s[pid] || s.players?.[pid] || s.perPlayer?.[pid]) ||
    {};

  // 2) perPlayer direct
  let darts = N(pstat.darts || pstat.dartsThrown, 0);
  let avg3 = N(pstat.avg3 || pstat.avg_3 || pstat.avg3Darts || pstat.avg3D || pstat.average3, 0);

  let points = (() => {
    // parfois points/score total dans summary
    const totalScore = N(pstat.totalScore || pstat.points || pstat.scored, 0);
    if (totalScore) return totalScore;
    if (darts > 0 && avg3 > 0) return (avg3 / 3) * darts;
    return 0;
  })();

  // 3) fallback payload.visits recalcul
  let bestVisit = Math.max(N(pstat.bestVisit, 0), N(pstat.best_visit, 0));
  let bestCheckout = Math.max(N(pstat.bestCheckout, 0), N(pstat.best_co, 0), N(pstat.bestFinish, 0));

  let h60 = N(pstat.h60, 0);
  let h100 = N(pstat.h100, 0);
  let h140 = N(pstat.h140, 0);
  let h180 = N(pstat.h180, 0);

  let bust = N(pstat.bust, 0);
  let miss = N(pstat.miss, 0);
  let doubles = N(pstat.doubles, 0);
  let triples = N(pstat.triples, 0);
  let bulls = N(pstat.bulls, 0);
  let dbull = N(pstat.dbull, 0);

  const pv = (m.raw as any)?.payload?.visits;
  if (Array.isArray(pv)) {
    let darts2 = 0;
    let scored2 = 0;

    let bestVisit2 = 0;
    let bestCheckout2 = 0;

    let h60_2 = 0,
      h100_2 = 0,
      h140_2 = 0,
      h180_2 = 0;
    let bust2 = 0,
      miss2 = 0,
      doubles2 = 0,
      triples2 = 0,
      bulls2 = 0,
      dbull2 = 0;

    for (const v of pv) {
      if (String(v?.p) !== pid) continue;

      const segs = Array.isArray(v.segments) ? v.segments : [];
      darts2 += segs.length || 0;

      const sc = N(v.score, 0);
      scored2 += sc;

      if (!v.bust) {
        if (sc > bestVisit2) bestVisit2 = sc;
        if (v.isCheckout && sc > bestCheckout2) bestCheckout2 = sc;
      }

      if (sc >= 60) h60_2 += 1;
      if (sc >= 100) h100_2 += 1;
      if (sc >= 140) h140_2 += 1;
      if (sc === 180) h180_2 += 1;

      bust2 += v.bust ? 1 : 0;

      for (const s2 of segs) {
        const vv = N(s2?.v, 0);
        const mm = N(s2?.mult, 1);

        if (vv === 0) miss2 += 1;
        if (mm === 2) doubles2 += 1;
        if (mm === 3) triples2 += 1;

        // bull / dbull
        if (vv === 25) bulls2 += mm === 2 ? 1 : 0.5;
        if (vv === 25 && mm === 2) dbull2 += 1;
      }
    }

    // ✅ si perPlayer est vide ou incomplet, on complète depuis visits
    if (!darts && darts2) darts = darts2;
    if (!points && scored2) points = scored2;

    if ((!avg3 || avg3 === 0) && (darts || darts2) > 0) {
      const dd = darts || darts2;
      const pp = points || scored2;
      avg3 = dd > 0 ? (pp / dd) * 3 : 0;
    }

    if (!bestVisit) bestVisit = bestVisit2;
    if (!bestCheckout) bestCheckout = bestCheckout2;

    if (!h60 && h60_2) h60 = h60_2;
    if (!h100 && h100_2) h100 = h100_2;
    if (!h140 && h140_2) h140 = h140_2;
    if (!h180 && h180_2) h180 = h180_2;

    if (!bust && bust2) bust = bust2;
    if (!miss && miss2) miss = miss2;
    if (!doubles && doubles2) doubles = doubles2;
    if (!triples && triples2) triples = triples2;
    if (!bulls && bulls2) bulls = bulls2;
    if (!dbull && dbull2) dbull = dbull2;
  }

  const finalDarts = N(darts, 0);
  const finalPoints = N(points, 0);
  const finalAvg3 = N(avg3, 0);

  return {
    darts: finalDarts,
    points: finalPoints,
    avg3: finalAvg3,
    bestVisit,
    bestCheckout,
    h60,
    h100,
    h140,
    h180,
    bust,
    miss,
    doubles,
    triples,
    bulls,
    dbull,
  };
}

/* ============================================================
   CRICKET — extraction tolérante des legs d'un profil depuis l'index
============================================================ */

function collectCricketLegsFromMatch(m: NormalizedMatch, profileId: string): CricketLegStats[] {
  const pid = String(profileId);
  const out: CricketLegStats[] = [];

  // (A) legacy : r.cricketLegs / r.summary.cricketLegs
  const raw: any = m.raw as any;
  const legsRawA = raw?.cricketLegs ?? raw?.summary?.cricketLegs ?? raw?.payload?.summary?.cricketLegs;
  if (Array.isArray(legsRawA)) {
    for (const leg of legsRawA) {
      if (leg && String(leg.playerId) === pid) out.push(leg);
    }
  }

  // (B) new : payload.players[].legStats (objet ou array) — payload peut être objet ou decoded
  const payloadObj = raw?.payload && typeof raw.payload === "object" ? raw.payload : null;
  const decoded = m.payloadObj && typeof m.payloadObj === "object" ? m.payloadObj : null;

  const playersArr =
    (payloadObj?.players && Array.isArray(payloadObj.players) ? payloadObj.players : null) ||
    (decoded?.players && Array.isArray(decoded.players) ? decoded.players : null) ||
    (decoded?.config?.players && Array.isArray(decoded.config.players) ? decoded.config.players : null) ||
    (raw?.players && Array.isArray(raw.players) ? raw.players : null) ||
    (raw?.summary?.players && Array.isArray(raw.summary.players) ? raw.summary.players : null) ||
    [];

  if (!playersArr.length) return out;

  const me =
    playersArr.find((p: any) => String(p?.id || p?.playerId) === pid) ||
    playersArr.find((p: any) => String(p?.profileId) === pid) ||
    null;

  if (!me) return out;

  const lsRaw = me.legStats ?? me.legsStats ?? me.cricketLegStats ?? null;
  const legsFromPayload: any[] = Array.isArray(lsRaw) ? lsRaw : lsRaw ? [lsRaw] : [];

  if (!legsFromPayload.length) return out;

  const matchId = String(m.id || raw?.matchId || "");
  const startedAt = m.createdAt || nowTs();
  const endedAt = m.updatedAt || startedAt;

  const others = playersArr.filter((p: any) => String(p?.id || p?.playerId || "") && String(p?.id || p?.playerId || "") !== pid);
  const opponentLabelFallback =
    others.length === 1
      ? String(others[0]?.name ?? others[0]?.label ?? "Opponent")
      : others.length > 1
      ? others.map((p: any) => String(p?.name ?? p?.label ?? "Opponent")).filter(Boolean).join(" / ")
      : "Opponent";

  for (let i = 0; i < legsFromPayload.length; i++) {
    const leg = legsFromPayload[i];
    if (!leg) continue;

    const fixed: CricketLegStats = {
      ...(leg as any),
      matchId: (leg as any).matchId ?? matchId ?? undefined,
      playerId: (leg as any).playerId ?? pid,
      legId: (leg as any).legId ?? `${matchId || "cricket"}:${pid}:${i}`,
      startedAt: N((leg as any).startedAt, startedAt) || startedAt,
      endedAt: N((leg as any).endedAt, endedAt) || endedAt,
      opponentLabel: (leg as any).opponentLabel ?? (me as any).opponentLabel ?? opponentLabelFallback,
    };

    if (String(fixed.playerId) === pid) out.push(fixed);
  }

  return out;
}

/* ============================================================
   GETTERS NOUVEAUX — PROFIL PAR MODE
============================================================ */

export async function getX01ProfileStats(profileId: string, range: RangeKey = "all", source: SourceKey = "all"): Promise<X01ProfileStats> {
  const empty: X01ProfileStats = {
    games: 0,
    wins: 0,
    winRate: 0,
    darts: 0,
    avg3: 0,
    bestVisit: 0,
    bestCheckout: 0,
    points: 0,
    visits: 0,
    h60: 0,
    h100: 0,
    h140: 0,
    h180: 0,
    bust: 0,
    miss: 0,
    doubles: 0,
    triples: 0,
    bulls: 0,
    dbull: 0,
  };

  if (!profileId) return empty;

  const idx = await buildStatsIndex(false);
  const mine = idx.byProfile[String(profileId)] || [];
  const rows = applyFilters(mine, range, source).filter((m) => m.kind === "x01" || m.mode === "x01");

  let games = 0;
  let wins = 0;

  let darts = 0;
  let points = 0;

  let bestVisit = 0;
  let bestCheckout = 0;

  let h60 = 0, h100 = 0, h140 = 0, h180 = 0;
  let bust = 0, miss = 0, doubles = 0, triples = 0, bulls = 0, dbull = 0;

  for (const m of rows) {
    // On compte "games" : match fini par défaut (sinon tu exploses les stats)
    if (m.status !== "finished") continue;

    games += 1;
    if (m.winnerId && String(m.winnerId) === String(profileId)) wins += 1;

    const x = extractX01PlayerStatsFromMatch(m, profileId);

    darts += N(x.darts, 0);
    points += N(x.points, 0);

    bestVisit = Math.max(bestVisit, N(x.bestVisit, 0));
    bestCheckout = Math.max(bestCheckout, N(x.bestCheckout, 0));

    h60 += N(x.h60, 0);
    h100 += N(x.h100, 0);
    h140 += N(x.h140, 0);
    h180 += N(x.h180, 0);

    bust += N(x.bust, 0);
    miss += N(x.miss, 0);
    doubles += N(x.doubles, 0);
    triples += N(x.triples, 0);
    bulls += N(x.bulls, 0);
    dbull += N(x.dbull, 0);
  }

  const avg3 = darts > 0 ? (points / darts) * 3 : 0;
  const winRate = games > 0 ? Math.round((wins / games) * 100) : 0;

  return {
    ...empty,
    games,
    wins,
    winRate,
    darts,
    points,
    avg3,
    bestVisit,
    bestCheckout,
    bestFinish: bestCheckout,
    h60,
    h100,
    h140,
    h180,
    bust,
    miss,
    doubles,
    triples,
    bulls,
    dbull,
  };
}

export async function getCricketProfileStats2(profileId: string, range: RangeKey = "all", source: SourceKey = "all"): Promise<CricketProfileStats> {
  if (!profileId) {
    return aggregateCricketProfileStats([], { maxHistoryItems: 30 });
  }
  const idx = await buildStatsIndex(false);
  const mine = idx.byProfile[String(profileId)] || [];
  const rows = applyFilters(mine, range, source).filter((m) => m.kind === "cricket" || m.mode === "cricket");

  const legs: CricketLegStats[] = [];
  for (const m of rows) {
    // cricket: même si pas "finished", legStats peut exister, mais tu veux souvent stats finies
    // -> on prend tout, l'agrégateur décidera
    legs.push(...collectCricketLegsFromMatch(m, profileId));
  }

  return aggregateCricketProfileStats(legs, { maxHistoryItems: 30 });
}

export async function getKillerProfileStats(
  profileId: string,
  range: RangeKey = "all",
  source: SourceKey = "all"
): Promise<KillerProfileStats> {
  const empty: KillerProfileStats = {
    matches: 0,
    wins: 0,
    winRate: 0,
    kills: 0,
    hitsTotal: 0,
    lastMatchAt: undefined,
  };
  if (!profileId) return empty;

  const idx = await buildStatsIndex(false);
  const mine = idx.byProfile[String(profileId)] || [];
  const rows = applyFilters(mine, range, source).filter(
    (m) => m.kind === "killer" || m.mode === "killer"
  );

  let matches = 0;
  let wins = 0;
  let kills = 0;
  let hitsTotal = 0;
  let lastMatchAt = 0;

  const pid = String(profileId);

  const readFromSummary = (sum: any) => {
    if (!sum) return;

    // ✅ Ton format KillerPlay: summary.perPlayer[] / summary.detailedByPlayer
    const per = Array.isArray(sum?.perPlayer) ? sum.perPlayer : [];
    const pp =
      per.find((x: any) => String(x?.playerId || x?.profileId || x?.id || "") === pid) ||
      null;

    if (pp) {
      kills += N(pp.kills, 0);

      // "hitsTotal" best-effort : killerHits + hitsOnSelf (ou offensiveThrows si tu préfères)
      const ht =
        N(pp.killerHits, 0) +
        N(pp.hitsOnSelf, 0);

      if (ht) hitsTotal += ht;
      else hitsTotal += N(pp.totalThrows, 0); // fallback
      return;
    }

    const det = sum?.detailedByPlayer?.[pid];
    if (det) {
      kills += N(det.kills, 0);
      const ht2 = N(det.killerHits, 0) + N(det.hitsOnSelf, 0);
      if (ht2) hitsTotal += ht2;
      else hitsTotal += N(det.totalThrows, 0);
      return;
    }

    // ✅ fallback ultra-legacy si un jour tu ajoutes des maps killsByPlayer
    kills += N(sum?.killsByPlayer?.[pid] ?? sum?.kills?.[pid] ?? 0, 0);
    hitsTotal += N(sum?.hitsByPlayer?.[pid] ?? sum?.hitsTotalByPlayer?.[pid] ?? 0, 0);
  };

  for (const m of rows) {
    if (m.status !== "finished") continue;

    matches += 1;
    if (m.winnerId && String(m.winnerId) === pid) wins += 1;
    lastMatchAt = Math.max(lastMatchAt, m.updatedAt || m.createdAt || 0);

    readFromSummary(m.summary);

    // payloadObj éventuel (payload string décodé)
    const d = m.payloadObj || null;
    if (d) readFromSummary(d?.summary || d?.result || d?.stats || null);

    // payload objet direct (si présent)
    const rawPayload = (m.raw as any)?.payload;
    if (rawPayload && typeof rawPayload === "object") {
      readFromSummary(rawPayload?.summary || null);
    }
  }

  const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0;

  return {
    matches,
    wins,
    winRate,
    kills,
    hitsTotal,
    lastMatchAt: lastMatchAt || undefined,
  };
}

export async function getShanghaiProfileStats(profileId: string, range: RangeKey = "all", source: SourceKey = "all"): Promise<ShanghaiProfileStats> {
  const empty: ShanghaiProfileStats = { matches: 0, wins: 0, winRate: 0, bestScore: 0, hitsTotal: 0, lastMatchAt: undefined };
  if (!profileId) return empty;

  const idx = await buildStatsIndex(false);
  const mine = idx.byProfile[String(profileId)] || [];
  const rows = applyFilters(mine, range, source).filter((m) => m.kind === "shanghai" || m.mode === "shanghai");

  let matches = 0;
  let wins = 0;
  let bestScore = 0;
  let hitsTotal = 0;
  let lastMatchAt = 0;

  for (const m of rows) {
    if (m.status !== "finished") continue;

    matches += 1;
    if (m.winnerId && String(m.winnerId) === String(profileId)) wins += 1;
    lastMatchAt = Math.max(lastMatchAt, m.updatedAt || m.createdAt || 0);

    const s: any = m.summary || {};
    const pid = String(profileId);

    // best-effort
    bestScore = Math.max(bestScore, N(s?.bestScoreByPlayer?.[pid] ?? s?.scoreByPlayer?.[pid] ?? s?.scores?.[pid] ?? 0, 0));
    hitsTotal += N(s?.hitsByPlayer?.[pid] ?? s?.hitsTotalByPlayer?.[pid] ?? 0, 0);

    const d = m.payloadObj || null;
    if (d) {
      bestScore = Math.max(bestScore, N(d?.summary?.bestScoreByPlayer?.[pid] ?? 0, 0));
      hitsTotal += N(d?.summary?.hitsByPlayer?.[pid] ?? 0, 0);
    }
  }

  const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0;
  return { matches, wins, winRate, bestScore, hitsTotal, lastMatchAt: lastMatchAt || undefined };
}

/* ============================================================
   GLOBAL + LEADERBOARDS
============================================================ */

export async function getGlobalStats(range: RangeKey = "all", source: SourceKey = "all"): Promise<GlobalStats> {
  const idx = await buildStatsIndex(false);
  const rows = applyFilters(idx.rows, range, source);

  let matches = 0;
  let finished = 0;
  let inProgress = 0;
  const byMode: Record<string, number> = {};

  for (const m of rows) {
    matches += 1;
    if (m.status === "finished") finished += 1;
    else inProgress += 1;

    const key = m.mode || m.kind || "unknown";
    byMode[key] = (byMode[key] || 0) + 1;
  }

  return { matches, finished, inProgress, byMode };
}

export async function getLeaderboards(args: {
  mode: LeaderboardMode;
  metric: LeaderboardMetric;
  range?: RangeKey;
  source?: SourceKey;
  minGames?: number;
}) {
  const { mode, metric, range = "all", source = "all", minGames = 1 } = args || ({} as any);
  const idx = await buildStatsIndex(false);

  // liste des profils présents dans index
  const profileIds = Object.keys(idx.byProfile || {});
  const rows: any[] = [];

  for (const pid of profileIds) {
    if (mode === "x01") {
      const s = await getX01ProfileStats(pid, range, source);
      if ((s.games || 0) < minGames) continue;

      const value =
        metric === "avg3" ? s.avg3 :
        metric === "winRate" ? s.winRate :
        metric === "wins" ? s.wins :
        metric === "games" ? s.games :
        metric === "bestVisit" ? s.bestVisit :
        metric === "bestCheckout" ? s.bestCheckout :
        metric === "h180" ? s.h180 :
        0;

      rows.push({ playerId: pid, value, stats: s });
    }

    if (mode === "cricket") {
      const s = await getCricketProfileStats2(pid, range, source);
      const games = N((s as any)?.matchesTotal ?? (s as any)?.matches ?? 0, 0);
      if (games < minGames) continue;

      // metric "precision" (à adapter selon ton CricketProfileStats réel)
      const precision =
        N((s as any)?.precision ?? (s as any)?.hitPct ?? 0, 0);

      const value =
        metric === "precision" ? precision :
        metric === "wins" ? N((s as any)?.wins ?? 0, 0) :
        metric === "games" ? games :
        0;

      rows.push({ playerId: pid, value, stats: s });
    }

    if (mode === "killer") {
      const s = await getKillerProfileStats(pid, range, source);
      if ((s.matches || 0) < minGames) continue;

      const value =
        metric === "winRate" ? s.winRate :
        metric === "wins" ? s.wins :
        metric === "games" ? s.matches :
        0;

      rows.push({ playerId: pid, value, stats: s });
    }

    if (mode === "shanghai") {
      const s = await getShanghaiProfileStats(pid, range, source);
      if ((s.matches || 0) < minGames) continue;

      const value =
        metric === "winRate" ? s.winRate :
        metric === "wins" ? s.wins :
        metric === "games" ? s.matches :
        0;

      rows.push({ playerId: pid, value, stats: s });
    }
  }

  rows.sort((a, b) => (b.value || 0) - (a.value || 0));
  return rows;
}

/* ============================================================
   X01 MULTI — agrégat Legs / Sets (compat)
============================================================ */

export type X01MultiModeCounters = {
  matchesWin: number;
  matchesTotal: number;
  legsWin: number;
  legsTotal: number;
  setsWin: number;
  setsTotal: number;
};

export type X01MultiLegsSets = {
  duo: X01MultiModeCounters;
  multi: X01MultiModeCounters;
  team: X01MultiModeCounters;
};

function createEmptyMultiCounters(): X01MultiModeCounters {
  return { matchesWin: 0, matchesTotal: 0, legsWin: 0, legsTotal: 0, setsWin: 0, setsTotal: 0 };
}
function createEmptyMultiLegsSets(): X01MultiLegsSets {
  return { duo: createEmptyMultiCounters(), multi: createEmptyMultiCounters(), team: createEmptyMultiCounters() };
}

export function computeX01MultiLegsSetsForProfileFromMatches(profileId: string, matches: SavedMatch[]): X01MultiLegsSets {
  const out = createEmptyMultiLegsSets();
  if (!profileId || !Array.isArray(matches) || !matches.length) return out;

  for (const m of matches) {
    if (!m || safeLower((m as any).kind) !== "x01") continue;

    const payload: any = (m as any).payload || {};
    const mode: string = payload.mode || payload.gameMode || "";

    if (!mode || mode === "x01_solo") continue;

    const players: any[] = (payload.config && payload.config.players) || (m as any).players || [];
    if (!players.length) continue;

    const me = players.find((p) => String(p.profileId || p.id || "") === String(profileId));
    if (!me) continue;

    const pid: string = String(me.id || profileId);

    const summary: any = (m as any).summary || payload.summary || {};
    const rankings: any[] = Array.isArray(summary.rankings) ? summary.rankings : [];

    let myLegs = 0, mySets = 0, totalLegs = 0, totalSets = 0;

    if (rankings.length) {
      for (const r of rankings) {
        const rLegs = Number(r.legsWon ?? r.legs ?? 0) || 0;
        const rSets = Number(r.setsWon ?? r.sets ?? 0) || 0;
        totalLegs += rLegs;
        totalSets += rSets;

        const rid = String(r.id ?? r.playerId ?? "");
        if (rid === pid) {
          myLegs = rLegs;
          mySets = rSets;
        }
      }
    } else {
      const legsMap: any = summary.legsWon || payload.legsWon || (payload.state && payload.state.legsWon);
      const setsMap: any = summary.setsWon || payload.setsWon || (payload.state && payload.state.setsWon);

      if (legsMap && typeof legsMap === "object") {
        for (const [k, v] of Object.entries(legsMap)) {
          const val = Number(v) || 0;
          totalLegs += val;
          if (String(k) === pid) myLegs = val;
        }
      }
      if (setsMap && typeof setsMap === "object") {
        for (const [k, v] of Object.entries(setsMap)) {
          const val = Number(v) || 0;
          totalSets += val;
          if (String(k) === pid) mySets = val;
        }
      }
    }

    let bucketKey: keyof X01MultiLegsSets;
    if (mode === "x01_teams") bucketKey = "team";
    else bucketKey = players.length <= 2 ? "duo" : "multi";

    const bucket = out[bucketKey];
    bucket.matchesTotal += 1;
    if ((m as any).winnerId && String((m as any).winnerId) === pid) bucket.matchesWin += 1;

    bucket.legsWin += myLegs;
    bucket.legsTotal += totalLegs;
    bucket.setsWin += mySets;
    bucket.setsTotal += totalSets;
  }

  return out;
}

/* ============================================================
   bumpBasicProfileStats — sécurité quota (évite crash)
============================================================ */

export function bumpBasicProfileStats(update: {
  playerId: string;
  darts: number;
  totalScore: number;
  bestVisit: number;
  bestCheckout: number;
  wins: number;
  games: number;
}) {
  try {
    if (!update.playerId) return;

    // ⚠️ si quota dépassé, on ne force pas (évite spam console)
    const raw = localStorage.getItem(QUICK_STATS_KEY);
    const bag: Record<string, QuickStatsEntry> = raw ? JSON.parse(raw) : {};

    const prev: QuickStatsEntry =
      bag[update.playerId] || {
        games: 0,
        darts: 0,
        avg3: 0,
        bestVisit: 0,
        bestCheckout: 0,
        wins: 0,
        winRate: 0,
        points: 0,
        totalScore: 0,
      };

    const prevTotal = N(prev.totalScore ?? prev.points ?? 0, 0);

    const darts = N(prev.darts, 0) + N(update.darts, 0);
    const totalScore = prevTotal + N(update.totalScore, 0);
    const games = N(prev.games, 0) + N(update.games, 0);
    const wins = N(prev.wins, 0) + N(update.wins, 0);

    const avg3 = darts > 0 ? (totalScore * 3) / darts : 0;
    const winRate = games > 0 ? (wins / games) * 100 : 0;

    bag[update.playerId] = {
      games,
      darts,
      avg3,
      bestVisit: Math.max(N(prev.bestVisit, 0), N(update.bestVisit, 0)),
      bestCheckout: Math.max(N(prev.bestCheckout, 0), N(update.bestCheckout, 0)),
      wins,
      winRate,
      totalScore,
      points: totalScore,
    };

    try {
      localStorage.setItem(QUICK_STATS_KEY, JSON.stringify(bag));
    } catch {
      // si quota dépassé : on abandonne silencieusement
    }
  } catch {
    // silencieux
  }
}

/* ============================================================
   StatsBridge — compat legacy (inchangé dans l'esprit)
============================================================ */

type LegacyMaps = {
  order: string[];
  winnerId: string | null;

  remaining: Record<string, number>;
  darts: Record<string, number>;
  visits: Record<string, number>;
  points: Record<string, number>;
  avg3: Record<string, number>;
  bestVisit: Record<string, number>;
  bestCheckout: Record<string, number>;

  h60: Record<string, number>;
  h100: Record<string, number>;
  h140: Record<string, number>;
  h180: Record<string, number>;

  miss: Record<string, number>;
  missPct: Record<string, number>;

  bust: Record<string, number>;
  bustPct: Record<string, number>;

  dbull: Record<string, number>;
  dbullPct: Record<string, number>;

  doubles: Record<string, number>;
  triples: Record<string, number>;
  bulls: Record<string, number>;
};

function newMap<T = number>(players: PlayerLite[], v: T | number = 0): Record<string, T> {
  const m: Record<string, any> = {};
  for (const p of players) m[p.id] = v;
  return m as Record<string, T>;
}

export const StatsBridge = {
  makeLeg(visits: Visit[], players: PlayerLite[], winnerId: string | null) {
    const darts = newMap<number>(players, 0);
    const visitsCount = newMap<number>(players, 0);
    const points = newMap<number>(players, 0);
    const remaining = newMap<number>(players, 0);

    const bestVisit = newMap<number>(players, 0);
    const bestCheckout = newMap<number>(players, 0);

    const h60 = newMap<number>(players, 0);
    const h100 = newMap<number>(players, 0);
    const h140 = newMap<number>(players, 0);
    const h180 = newMap<number>(players, 0);

    const miss = newMap<number>(players, 0);
    const bust = newMap<number>(players, 0);
    const dbull = newMap<number>(players, 0);

    const doubles = newMap<number>(players, 0);
    const triples = newMap<number>(players, 0);
    const bulls = newMap<number>(players, 0);

    for (const v of visits || []) {
      const pid = v.p;
      const segs = Array.isArray(v.segments) ? v.segments : [];
      const visitPoints = N(v.score, 0);

      visitsCount[pid] = (visitsCount[pid] || 0) + 1;
      darts[pid] = (darts[pid] || 0) + (segs.length || 0);
      points[pid] = (points[pid] || 0) + visitPoints;

      if (v.remainingAfter != null) remaining[pid] = N(v.remainingAfter, remaining[pid] || 0);

      bestVisit[pid] = Math.max(bestVisit[pid] || 0, visitPoints);

      if (v.isCheckout && segs.length) {
        const last = segs[segs.length - 1];
        bestCheckout[pid] = Math.max(bestCheckout[pid] || 0, dartValue(last));
      }

      if (visitPoints >= 60) h60[pid] += 1;
      if (visitPoints >= 100) h100[pid] += 1;
      if (visitPoints >= 140) h140[pid] += 1;
      if (visitPoints === 180) h180[pid] += 1;

      bust[pid] += v.bust ? 1 : 0;

      for (const s of segs) {
        if ((s.v || 0) === 0) miss[pid] += 1;
        if (s.v === 25 && s.mult === 2) dbull[pid] += 1;

        if (s.mult === 2) doubles[pid] += 1;
        if (s.mult === 3) triples[pid] += 1;
        if (s.v === 25) bulls[pid] += s.mult === 2 ? 1 : 0.5;
      }
    }

    const avg3 = newMap<number>(players, 0);
    const missPct = newMap<number>(players, 0);
    const bustPct = newMap<number>(players, 0);
    const dbullPct = newMap<number>(players, 0);

    for (const p of players) {
      const pid = p.id;
      const d = darts[pid] || 0;
      const pts = points[pid] || 0;

      avg3[pid] = d > 0 ? Math.round(((pts / d) * 3) * 100) / 100 : 0;
      missPct[pid] = pct(miss[pid] || 0, d);
      dbullPct[pid] = pct(dbull[pid] || 0, d);
      bustPct[pid] = pct(bust[pid] || 0, visitsCount[pid] || 0);
    }

    const order = [...players]
      .sort((a, b) => {
        const ar = remaining[a.id] ?? Number.MAX_SAFE_INTEGER;
        const br = remaining[b.id] ?? Number.MAX_SAFE_INTEGER;
        if (ar === 0 && br !== 0) return -1;
        if (ar !== 0 && br === 0) return 1;
        if (ar !== br) return ar - br;
        return (avg3[b.id] ?? 0) - (avg3[a.id] ?? 0);
      })
      .map((p) => p.id);

    const legacy: LegacyMaps = {
      order,
      winnerId: winnerId ?? (order[0] ?? null),

      remaining,
      darts,
      visits: visitsCount,
      points,
      avg3,
      bestVisit,
      bestCheckout,

      h60,
      h100,
      h140,
      h180,

      miss,
      missPct,

      bust,
      bustPct,

      dbull,
      dbullPct,

      doubles,
      triples,
      bulls,
    };

    const leg = {
      winnerId: legacy.winnerId,
      perPlayer: players.map((p) => {
        const pid = p.id;
        return {
          playerId: pid,
          darts: darts[pid] || 0,
          points: points[pid] || 0,
          avg3: avg3[pid] || 0,
          bestVisit: bestVisit[pid] || 0,
          bestCheckout: bestCheckout[pid] || 0,
          h60: h60[pid] || 0,
          h100: h100[pid] || 0,
          h140: h140[pid] || 0,
          h180: h180[pid] || 0,
          miss: miss[pid] || 0,
          bust: bust[pid] || 0,
          dbull: dbull[pid] || 0,
        };
      }),
    };

    return { leg, legacy };
  },

  async commitLegAndAccumulate(_leg: any, legacy: LegacyMaps) {
    try {
      const raw = localStorage.getItem(QUICK_STATS_KEY);
      const bag: Record<string, QuickStatsEntry> = raw ? JSON.parse(raw) : {};

      const pids = Object.keys(legacy?.darts || {});
      const winnerId = legacy?.winnerId || null;

      for (const pid of pids) {
        const s: QuickStatsEntry =
          bag[pid] ??
          ({
            games: 0,
            darts: 0,
            avg3: 0,
            bestVisit: 0,
            bestCheckout: 0,
            wins: 0,
            winRate: 0,
            points: 0,
            totalScore: 0,
          } as QuickStatsEntry);

        s.games += 1;

        const d = N(legacy.darts[pid], 0);
        const a3 = N(legacy.avg3[pid], 0);
        const ptsApprox = d > 0 ? (a3 / 3) * d : 0;

        s.darts += d;
        const prevTotal = N(s.totalScore ?? s.points ?? 0, 0);
        const totalScore = prevTotal + ptsApprox;
        s.totalScore = totalScore;
        s.points = totalScore;

        s.avg3 = s.darts > 0 ? (totalScore / s.darts) * 3 : 0;

        s.bestVisit = Math.max(N(s.bestVisit, 0), N(legacy.bestVisit[pid], 0));
        s.bestCheckout = Math.max(N(s.bestCheckout, 0), N(legacy.bestCheckout[pid], 0));

        if (winnerId && winnerId === pid) s.wins += 1;

        bag[pid] = s;
      }

      try {
        localStorage.setItem(QUICK_STATS_KEY, JSON.stringify(bag));
      } catch {
        // quota
      }
    } catch {
      // silence
    }
  },

  makeMatch(legs: any[], players: PlayerLite[], matchId: string, kind: string) {
    const perPid: Record<string, any> = Object.fromEntries(
      players.map((p) => [
        p.id,
        { playerId: p.id, darts: 0, points: 0, bestVisit: 0, bestCheckout: 0, h60: 0, h100: 0, h140: 0, h180: 0 },
      ])
    );

    let winnerId: string | null = null;

    for (const leg of legs || []) {
      if (!winnerId && leg?.winnerId) winnerId = leg.winnerId;
      for (const pp of leg?.perPlayer || []) {
        const acc = perPid[pp.playerId];
        if (!acc) continue;

        acc.darts += N(pp.darts, 0);
        acc.points += N(pp.points, 0);
        acc.bestVisit = Math.max(acc.bestVisit, N(pp.bestVisit, 0));
        acc.bestCheckout = Math.max(acc.bestCheckout, N(pp.bestCheckout, 0));
        acc.h60 += N(pp.h60, 0);
        acc.h100 += N(pp.h100, 0);
        acc.h140 += N(pp.h140, 0);
        acc.h180 += N(pp.h180, 0);
      }
    }

    const perPlayer = players.map((p) => {
      const acc = perPid[p.id];
      const avg3 = acc.darts > 0 ? (acc.points / acc.darts) * 3 : 0;
      return {
        playerId: p.id,
        name: p.name || "",
        darts: acc.darts,
        avg3: Math.round(avg3 * 100) / 100,
        bestVisit: acc.bestVisit,
        bestCheckout: acc.bestCheckout,
        h60: acc.h60,
        h100: acc.h100,
        h140: acc.h140,
        h180: acc.h180,
        win: !!winnerId && winnerId === p.id,
      };
    });

    return { id: matchId, kind, createdAt: nowTs(), winnerId: winnerId ?? null, perPlayer };
  },

  async commitMatchAndSave(summary: any, extra?: any) {
    try {
      const allKey = "dc-matches";
      const raw = localStorage.getItem(allKey);
      const arr: any[] = raw ? JSON.parse(raw) : [];
      arr.unshift({ summary, extra, ts: nowTs() });
      while (arr.length > 200) arr.pop();
      try {
        localStorage.setItem(allKey, JSON.stringify(arr));
      } catch {}

      const bagRaw = localStorage.getItem(QUICK_STATS_KEY);
      const bag: Record<string, QuickStatsEntry> = bagRaw ? JSON.parse(bagRaw) : {};
      const pids: string[] = (summary?.perPlayer || []).map((pp: any) => pp.playerId);

      for (const pid of pids) {
        const s: QuickStatsEntry =
          bag[pid] ??
          ({ games: 0, darts: 0, avg3: 0, bestVisit: 0, bestCheckout: 0, wins: 0, winRate: 0, points: 0, totalScore: 0 } as QuickStatsEntry);

        s.games += 1;
        if (summary?.winnerId && summary.winnerId === pid) s.wins += 1;

        bag[pid] = s;
      }

      try {
        localStorage.setItem(QUICK_STATS_KEY, JSON.stringify(bag));
      } catch {}
    } catch {
      // silence
    }
  },

  getBasicProfileStats(profileId: string): BasicProfileStats {
    try {
      const raw = localStorage.getItem(QUICK_STATS_KEY);
      const bag: Record<string, QuickStatsEntry> = raw ? JSON.parse(raw) : {};
      const s = bag[profileId] || null;

      if (!s) return { games: 0, darts: 0, avg3: 0, bestVisit: 0, bestCheckout: 0, wins: 0 };

      const games = N(s.games, 0);
      const darts = N(s.darts, 0);
      const totalScore = N(s.totalScore ?? s.points ?? 0, 0);

      let avg3 = N(s.avg3, 0);
      if (!avg3 && darts > 0 && totalScore > 0) avg3 = (totalScore * 3) / darts;

      return {
        games,
        darts,
        avg3,
        bestVisit: N(s.bestVisit, 0),
        bestCheckout: N(s.bestCheckout, 0),
        wins: N(s.wins, 0),
        winRate: (s as any).winRate,
      };
    } catch {
      return { games: 0, darts: 0, avg3: 0, bestVisit: 0, bestCheckout: 0, wins: 0 };
    }
  },

  getMergedProfilesStats(profiles: PlayerLite[]) {
    const out: Record<string, BasicProfileStats> = {};
    for (const p of profiles || []) out[p.id] = this.getBasicProfileStats(p.id);
    return out;
  },

  getProfileQuickStats(profileId: string) {
    return this.getBasicProfileStats(profileId);
  },

  async getBasicProfileStatsAsync(profileId: string): Promise<BasicProfileStats> {
    // ⚠️ nouveau : on se base sur le vrai index (moins de “0 partout”)
    const x01 = await getX01ProfileStats(profileId, "all", "all");
    return {
      games: x01.games,
      wins: x01.wins,
      winRate: x01.winRate,
      darts: x01.darts,
      avg3: x01.avg3,
      bestVisit: x01.bestVisit,
      bestCheckout: x01.bestCheckout,
      coTotal: 0,
    };
  },

  async getCricketProfileStats(profileId: string): Promise<CricketProfileStats> {
    return getCricketProfileStats2(profileId, "all", "all");
  },

  async getX01MultiLegsSetsForProfile(profileId: string): Promise<X01MultiLegsSets> {
    if (!profileId) return createEmptyMultiLegsSets();
    try {
      const rows = await History.list();
      const matches = (rows as SavedMatch[]).filter((m) => safeLower((m as any).kind) === "x01");
      return computeX01MultiLegsSetsForProfileFromMatches(profileId, matches);
    } catch {
      return createEmptyMultiLegsSets();
    }
  },
};

/* ============================================================
   Alias exports (compat import { ... })
============================================================ */

export const getBasicProfileStats = (profileId: string) => StatsBridge.getBasicProfileStats(profileId);
export const getMergedProfilesStats = (profiles: PlayerLite[]) => StatsBridge.getMergedProfilesStats(profiles);
export const getProfileQuickStats = (profileId: string) => StatsBridge.getProfileQuickStats(profileId);
export const getBasicProfileStatsAsync = (profileId: string) => StatsBridge.getBasicProfileStatsAsync(profileId);

// ✅ Legacy name mais maintenant alimenté par l'index
export const getCricketProfileStats = (profileId: string) => StatsBridge.getCricketProfileStats(profileId);

// ✅ X01 multi
export const getX01MultiLegsSetsForProfile = (profileId: string) => StatsBridge.getX01MultiLegsSetsForProfile(profileId);
