// src/lib/matchCompactCodec.ts
// =========================================================
// Compact match codec v1
// Objectif : conserver TOUTES les données statistiques utiles,
// mais sans répéter profils/avatars/champs verbeux dans l'historique.
//
// Principe :
// - header lisible et très court pour StatsHub
// - dictionnaire joueurs: playerId -> index numérique
// - stats par joueur conservées en "sacs" numériques/catégoriels
// - détail compact optionnel, sans data:image, sans objets UI/runtime
// - décodeur tolérant: ancien format => nouveau format lisible
// =========================================================

export type CompactMatchMode =
  | "x01"
  | "cricket"
  | "killer"
  | "golf"
  | "shanghai"
  | "territories"
  | "scram"
  | "batard"
  | "babyfoot"
  | "petanque"
  | "molkky"
  | "pingpong"
  | "dice"
  | "training"
  | "unknown";

export type CompactPlayerStat = {
  /** player index in p[] */
  i: number;
  /** rank / final position */
  r?: number;
  /** numeric stats, short keys preserved from source */
  n?: Record<string, number>;
  /** categorical/text stats, short values only */
  c?: Record<string, string | number | boolean | null>;
  /** histograms / buckets / distributions */
  h?: Record<string, number>;
};

export type CompactMatchV1 = {
  /** compact schema marker */
  __compact: "match.v1";
  /** schema version */
  v: 1;
  /** id */
  id: string;
  /** sport */
  sp: string;
  /** mode */
  m: CompactMatchMode;
  /** unix ms created/updated */
  t: number;
  u?: number;
  /** status */
  st: "f" | "p" | "s";
  /** player ids dictionary */
  p: string[];
  /** winner index */
  w?: number;
  /** options/config compact */
  o?: Record<string, any>;
  /** final scores/rankings/stats per player */
  ps: CompactPlayerStat[];
  /** per-mode detail, compact but still decodable */
  d?: any;
  /** stats coverage marker: which sources were scanned */
  cov?: string[];
};

export type DecodedCompactMatch = {
  id: string;
  kind: CompactMatchMode;
  mode: CompactMatchMode;
  sport: string;
  status: "finished" | "in_progress" | "saved";
  createdAt: number;
  updatedAt?: number;
  players: Array<Record<string, any>>;
  winnerId?: string | null;
  summary: Record<string, any>;
  detail?: any;
  compact: CompactMatchV1;
};

const NUMERIC_HINTS = [
  "score", "points", "marks", "darts", "dart", "avg", "mpr", "ppd", "best", "checkout", "co",
  "win", "wins", "loss", "losses", "rank", "legs", "sets", "kills", "hit", "hits", "miss", "misses",
  "bull", "dbull", "shield", "resurrection", "damage", "streak", "round", "turn", "visit", "duration",
  "assist", "goal", "goals", "penalty", "fanny", "mene", "throw", "throws", "closed", "open"
];

const DROP_KEYS = new Set([
  "avatar", "avatarUrl", "avatarURL", "avatarDataUrl", "avatar_data_url", "image", "photo", "picture",
  "html", "css", "style", "className", "element", "ref", "dom", "component", "children",
  "audio", "sound", "voice", "toast", "modal", "debug", "diag", "diagnostic", "runtime", "stack",
  "payloadCompressed", "compact", "__compact"
]);

const PLAYER_ID_KEYS = ["id", "playerId", "profileId", "uid", "userId", "localId"];
const PLAYER_NAME_KEYS = ["name", "displayName", "nickname", "label"];

function toNum(v: any): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && /^-?\d+(\.\d+)?$/.test(v.trim())) {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function ts(v: any): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Date.parse(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function shortKey(key: string): string {
  const raw = String(key || "").trim();
  const map: Record<string, string> = {
    playerId: "pid", profileId: "pid", dartsThrown: "dt", darts: "dt", dartsTotal: "dt",
    pointsScored: "pts", points: "pts", score: "sc", bestVisit: "bv", best_visit: "bv",
    bestCheckout: "bc", bestFinish: "bc", average: "avg", avg3: "avg3", mpr: "mpr",
    marksTotal: "mk", marks: "mk", hitsTotal: "hit", hitCount: "hit", hitsCount: "hit",
    misses: "mis", kills: "kil", deaths: "dea", shields: "shi", resurrections: "res",
    rank: "rk", position: "rk", legsWon: "lw", setsWon: "sw", checkoutRate: "cor",
    winRate: "wr", durationMs: "dur", duration: "dur", rounds: "rnd", turns: "trn", visits: "vis"
  };
  return map[raw] || raw.replace(/[A-Z]/g, (m) => m.toLowerCase()).replace(/[^a-z0-9_+-]/gi, "").slice(0, 18) || "x";
}

function looksStatKey(k: string): boolean {
  const s = String(k || "").toLowerCase();
  return NUMERIC_HINTS.some((h) => s.includes(h));
}

function isPlainObject(v: any): v is Record<string, any> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function stripHeavy(value: any, depth = 0): any {
  if (value == null) return value;
  if (depth > 8) return undefined;
  if (typeof value === "string") {
    if (value.startsWith("data:image") || value.length > 512) return undefined;
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    // On conserve les tableaux statistiques, mais on évite les explosions de payload.
    const max = depth <= 3 ? 500 : 160;
    return value.slice(-max).map((x) => stripHeavy(x, depth + 1)).filter((x) => x !== undefined);
  }
  if (isPlainObject(value)) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (DROP_KEYS.has(k)) continue;
      const sv = stripHeavy(v, depth + 1);
      if (sv !== undefined) out[shortKey(k)] = sv;
    }
    return out;
  }
  return undefined;
}

function inferMode(rec: any, payload: any): CompactMatchMode {
  const raw = String(
    rec?.kind ?? rec?.mode ?? rec?.game?.mode ?? rec?.game ?? payload?.kind ?? payload?.mode ?? payload?.game?.mode ?? payload?.game ?? payload?.config?.mode ?? ""
  ).toLowerCase();
  if (raw.includes("x01") || raw.includes("301") || raw.includes("501")) return "x01";
  if (raw.includes("cricket")) return "cricket";
  if (raw.includes("killer")) return "killer";
  if (raw.includes("golf")) return "golf";
  if (raw.includes("shanghai")) return "shanghai";
  if (raw.includes("territ")) return "territories";
  if (raw.includes("scram")) return "scram";
  if (raw.includes("batard") || raw.includes("bastard")) return "batard";
  if (raw.includes("baby") || raw.includes("foot")) return "babyfoot";
  if (raw.includes("petanque") || raw.includes("pétanque")) return "petanque";
  if (raw.includes("molkky") || raw.includes("mölkky")) return "molkky";
  if (raw.includes("ping") || raw.includes("pong")) return "pingpong";
  if (raw.includes("dice") || raw.includes("yams") || raw.includes("yam")) return "dice";
  if (raw.includes("training") || raw.includes("entrain")) return "training";
  if (payload?.x01 || payload?.startScore || payload?.config?.startScore) return "x01";
  return "unknown";
}

function statusCode(status: any): "f" | "p" | "s" {
  const s = String(status || "").toLowerCase();
  if (s.includes("finish") || s === "done" || s === "ended") return "f";
  if (s.includes("save")) return "s";
  return "p";
}

function decodeStatus(st: any): "finished" | "in_progress" | "saved" {
  if (st === "f") return "finished";
  if (st === "s") return "saved";
  return "in_progress";
}

function getPlayerId(p: any): string {
  for (const k of PLAYER_ID_KEYS) {
    const v = p?.[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

function getPlayerName(p: any): string | undefined {
  for (const k of PLAYER_NAME_KEYS) {
    const v = p?.[k];
    if (v != null && String(v).trim()) return String(v).trim().slice(0, 80);
  }
  return undefined;
}

function addPlayer(dict: string[], id: string): number {
  const safeId = String(id || "").trim();
  if (!safeId) return -1;
  const found = dict.indexOf(safeId);
  if (found >= 0) return found;
  dict.push(safeId);
  return dict.length - 1;
}

function collectPlayers(rec: any, payload: any): any[] {
  // X01 V3 sauvegarde souvent les stats sous summary.players = { [playerId]: stats }.
  // L'ancien compacteur ignorait cette map et ne gardait que rec.players => stats à 0 en détail historique.
  const sources = [
    rec?.players, rec?.summary?.players, payload?.players, payload?.state?.players, payload?.summary?.players,
    payload?.stats?.players, payload?.result?.players, payload?.match?.players, payload?.config?.players, payload?.cfg?.players,
    payload?.teams, payload?.state?.teams, payload?.summary?.teams
  ];
  const byId = new Map<string, any>();
  const pushOne = (row: any, forcedId?: string) => {
    if (!row || typeof row !== "object") return;
    const id = forcedId || getPlayerId(row);
    if (!id) return;
    byId.set(id, { ...(byId.get(id) || {}), ...(row || {}), id, playerId: row.playerId ?? id });
  };
  for (const src of sources) {
    if (Array.isArray(src)) {
      for (const row of src) pushOne(row);
    } else if (isPlainObject(src)) {
      for (const [id, row] of Object.entries(src)) pushOne(row, String(id));
    }
  }
  return [...byId.values()];
}

function collectWinnerId(rec: any, payload: any): string | undefined {
  const w = rec?.winnerId ?? rec?.summary?.winnerId ?? payload?.winnerId ?? payload?.state?.winnerId ?? payload?.summary?.winnerId ?? payload?.result?.winnerId ?? payload?.winner?.id;
  return w == null ? undefined : String(w);
}

function flattenNumericStats(src: any, out: Record<string, number>, prefix = "", depth = 0) {
  if (!src || depth > 4) return;
  if (Array.isArray(src)) {
    // Les tableaux de valeurs numériques utiles deviennent histogrammes simples.
    if (src.length && src.every((x) => toNum(x) !== undefined)) {
      out[shortKey(prefix || "arr_sum")] = src.reduce((a, b) => a + (toNum(b) || 0), 0);
      out[shortKey(`${prefix || "arr"}_count`)] = src.length;
      out[shortKey(`${prefix || "arr"}_max`)] = Math.max(...src.map((x) => toNum(x) || 0));
    }
    return;
  }
  if (!isPlainObject(src)) return;
  for (const [k, v] of Object.entries(src)) {
    if (DROP_KEYS.has(k)) continue;
    const key = shortKey(prefix ? `${prefix}_${k}` : k);
    const n = toNum(v);
    if (n !== undefined && (looksStatKey(k) || prefix)) {
      out[key] = n;
    } else if (isPlainObject(v)) {
      flattenNumericStats(v, out, key, depth + 1);
    }
  }
}

function collectHistogram(src: any, out: Record<string, number>, prefix = "", depth = 0) {
  if (!src || depth > 3) return;
  if (Array.isArray(src)) return;
  if (!isPlainObject(src)) return;
  for (const [k, v] of Object.entries(src)) {
    if (DROP_KEYS.has(k)) continue;
    const n = toNum(v);
    if (n !== undefined) {
      const lk = String(k).toLowerCase();
      if (lk.includes("bucket") || lk.includes("hist") || lk.includes("segment") || lk.includes("hit") || lk.includes("mark") || /^([std]?(20|19|18|17|16|15|25|bull|dbull)|\d+\+)$/.test(lk)) {
        out[shortKey(prefix ? `${prefix}_${k}` : k)] = n;
      }
    } else if (isPlainObject(v)) {
      collectHistogram(v, out, shortKey(prefix ? `${prefix}_${k}` : k), depth + 1);
    }
  }
}

function collectCategorical(src: any, out: Record<string, string | number | boolean | null>, depth = 0) {
  if (!isPlainObject(src) || depth > 2) return;
  for (const [k, v] of Object.entries(src)) {
    if (DROP_KEYS.has(k)) continue;
    if (typeof v === "string" && v.length <= 80 && !v.startsWith("data:")) {
      const lk = String(k).toLowerCase();
      if (lk.includes("out") || lk.includes("rule") || lk.includes("mode") || lk.includes("type") || lk.includes("status")) out[shortKey(k)] = v;
    } else if (typeof v === "boolean") {
      out[shortKey(k)] = v;
    } else if (isPlainObject(v)) {
      collectCategorical(v, out, depth + 1);
    }
  }
}

function compactOptions(rec: any, payload: any): Record<string, any> | undefined {
  const cfg = rec?.game ?? payload?.config ?? payload?.cfg ?? payload?.game?.config ?? payload?.options ?? null;
  const clean = stripHeavy(cfg);
  return clean && isPlainObject(clean) && Object.keys(clean).length ? clean : undefined;
}

function compactDetailForMode(mode: CompactMatchMode, payload: any, playerIds: string[]): any {
  if (!payload || typeof payload !== "object") return undefined;
  const indexOf = (id: any) => playerIds.indexOf(String(id));

  const takeVisit = (v: any) => {
    if (!v || typeof v !== "object") return stripHeavy(v);
    const pid = v.playerId ?? v.profileId ?? v.id ?? v.uid;
    const out: any[] = [];
    if (pid != null) out.push(indexOf(pid));
    if (v.round != null) out.push(toNum(v.round) ?? v.round);
    if (v.score != null) out.push(toNum(v.score) ?? v.score);
    if (Array.isArray(v.darts)) out.push(v.darts.map((d: any) => typeof d === "string" ? d : (d?.code ?? d?.segment ?? d?.label ?? d?.score ?? "")).filter(Boolean).join(","));
    else if (v.segment || v.code) out.push(v.code ?? v.segment);
    if (v.bust) out.push("B");
    if (v.isCheckout || v.checkout) out.push("CO");
    return out.length ? out : stripHeavy(v);
  };

  const visits = payload.visits ?? payload.turns ?? payload.rounds ?? payload.darts ?? payload.hits ?? payload.events;
  const out: any = {};
  if (Array.isArray(visits)) out.e = visits.slice(-600).map(takeVisit);
  const state = payload.finalState ?? payload.state ?? payload.result ?? payload.summary;
  const cleanState = stripHeavy(state);
  if (cleanState && Object.keys(cleanState || {}).length) out.s = cleanState;
  if (mode === "x01") {
    const legs = payload.legs ?? payload.sets ?? payload.legResults;
    if (legs) out.l = stripHeavy(legs);
  }
  return Object.keys(out).length ? out : undefined;
}

export function encodeCompactMatch(input: any): CompactMatchV1 | null {
  try {
    const rec = input || {};
    const payload = rec.payload && typeof rec.payload === "object" ? rec.payload : rec;
    const id = String(rec.id ?? rec.matchId ?? payload.id ?? payload.matchId ?? `m_${Date.now()}`);
    const mode = inferMode(rec, payload);
    const players = collectPlayers(rec, payload);
    const p: string[] = [];
    const ps: CompactPlayerStat[] = [];
    const names: Record<number, string> = {};

    for (const pl of players) {
      const pid = getPlayerId(pl);
      const idx = addPlayer(p, pid);
      if (idx < 0) continue;
      const n: Record<string, number> = {};
      const h: Record<string, number> = {};
      const c: Record<string, string | number | boolean | null> = {};
      flattenNumericStats(pl, n);
      flattenNumericStats(pl?.stats, n, "st");
      flattenNumericStats(pl?.legStats, n, "leg");
      flattenNumericStats(pl?.summary, n, "sum");
      collectHistogram(pl, h);
      collectHistogram(pl?.stats, h, "st");
      collectCategorical(pl, c);
      const nm = getPlayerName(pl);
      if (nm) names[idx] = nm;
      const rank = toNum(pl?.rank ?? pl?.position ?? pl?.place ?? pl?.finalRank);
      ps.push({ i: idx, ...(rank !== undefined ? { r: rank } : {}), ...(Object.keys(n).length ? { n } : {}), ...(Object.keys(c).length ? { c } : {}), ...(Object.keys(h).length ? { h } : {}) });
    }

    const winnerId = collectWinnerId(rec, payload);
    const w = winnerId ? p.indexOf(winnerId) : -1;
    const createdAt = ts(rec.createdAt) ?? ts(payload.createdAt) ?? Date.now();
    const updatedAt = ts(rec.updatedAt) ?? ts(payload.updatedAt);
    const compact: CompactMatchV1 = {
      __compact: "match.v1",
      v: 1,
      id,
      sp: String(rec.sport ?? payload.sport ?? "darts"),
      m: mode,
      t: createdAt,
      ...(updatedAt ? { u: updatedAt } : {}),
      st: statusCode(rec.status ?? payload.status ?? (winnerId ? "finished" : "in_progress")),
      p,
      ...(w >= 0 ? { w } : {}),
      ...(compactOptions(rec, payload) ? { o: compactOptions(rec, payload) } : {}),
      ps,
      ...(compactDetailForMode(mode, payload, p) ? { d: compactDetailForMode(mode, payload, p) } : {}),
      cov: ["players", "summary", "payload", mode],
    };
    if (Object.keys(names).length) (compact as any).pn = names;
    return compact;
  } catch {
    return null;
  }
}

export function decodeCompactMatch(compact: any): DecodedCompactMatch | null {
  try {
    if (!compact || compact.__compact !== "match.v1" || compact.v !== 1) return null;
    const players = (Array.isArray(compact.p) ? compact.p : []).map((id: string, i: number) => {
      const ps = (Array.isArray(compact.ps) ? compact.ps : []).find((x: any) => Number(x?.i) === i) || {};
      const out: any = {
        id,
        playerId: id,
        name: (compact as any).pn?.[i],
        rank: ps.r,
        stats: { ...(ps.n || {}), ...(ps.h || {}) },
        compactStats: ps,
      };
      // Compat noms utilisés par les extracteurs actuels
      if (ps.n?.dt != null) out.dartsThrown = ps.n.dt;
      if (ps.n?.pts != null) out.pointsScored = ps.n.pts;
      if (ps.n?.sc != null) out.score = ps.n.sc;
      if (ps.n?.avg3 != null) out.avg3 = ps.n.avg3;
      if (ps.n?.avg != null && out.avg3 == null) out.avg3 = ps.n.avg;
      if (ps.n?.vis != null) out.visits = ps.n.vis;
      if (ps.n?.bv != null) out.bestVisit = ps.n.bv;
      if (ps.n?.bc != null) out.bestCheckout = ps.n.bc;
      if (ps.n?.mk != null) out.marksTotal = ps.n.mk;
      if (ps.n?.mpr != null) out.mpr = ps.n.mpr;
      if (ps.n?.kil != null) out.kills = ps.n.kil;
      return out;
    });
    const winnerId = Number.isInteger(compact.w) && compact.p?.[compact.w] ? String(compact.p[compact.w]) : null;
    const playersMap: Record<string, any> = {};
    const detailedByPlayer: Record<string, any> = {};
    for (const p of players as any[]) {
      const id = String(p?.id || p?.playerId || "");
      if (!id) continue;
      playersMap[id] = {
        id,
        name: p.name,
        avg3: toNum(p.avg3) ?? 0,
        bestVisit: toNum(p.bestVisit) ?? 0,
        bestCheckout: toNum(p.bestCheckout) ?? 0,
        darts: toNum(p.dartsThrown) ?? 0,
        _sumDarts: toNum(p.dartsThrown) ?? 0,
        _sumPoints: toNum(p.pointsScored) ?? 0,
        _sumVisits: toNum(p.visits) ?? undefined,
        matches: 1,
        legs: 1,
      };
      detailedByPlayer[id] = {
        ...p,
        playerId: id,
        profileId: id,
        darts: toNum(p.dartsThrown) ?? 0,
        dartsThrown: toNum(p.dartsThrown) ?? 0,
        pointsScored: toNum(p.pointsScored) ?? 0,
        avg3: toNum(p.avg3) ?? 0,
        bestVisit: toNum(p.bestVisit) ?? 0,
        bestCheckout: toNum(p.bestCheckout) ?? 0,
      };
    }
    return {
      id: String(compact.id || ""),
      kind: compact.m || "unknown",
      mode: compact.m || "unknown",
      sport: String(compact.sp || "darts"),
      status: decodeStatus(compact.st),
      createdAt: Number(compact.t || Date.now()),
      updatedAt: compact.u ? Number(compact.u) : undefined,
      players,
      winnerId,
      summary: { players: playersMap, perPlayer: players, detailedByPlayer, winnerId, options: compact.o || {}, compact: true },
      detail: compact.d,
      compact,
    };
  } catch {
    return null;
  }
}

export function normalizeMatchForStats(rec: any, payload?: any): any {
  const compact = rec?.compact ?? payload?.compact ?? (rec?.__compact === "match.v1" ? rec : null) ?? (payload?.__compact === "match.v1" ? payload : null);
  const decoded = decodeCompactMatch(compact);
  if (!decoded) return payload || rec;
  return {
    ...(payload && typeof payload === "object" ? payload : {}),
    ...decoded,
    players: decoded.players,
    winnerId: decoded.winnerId,
    summary: decoded.summary,
    result: { ...(payload?.result || {}), winnerId: decoded.winnerId, players: decoded.players },
  };
}

export function estimateCompactBytes(compact: any): number {
  try {
    return new Blob([JSON.stringify(compact || null)]).size;
  } catch {
    try { return JSON.stringify(compact || null).length; } catch { return 0; }
  }
}
