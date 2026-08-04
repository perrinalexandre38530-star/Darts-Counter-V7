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
  | "five_lives"
  | "loterie"
  | "warfare"
  | "battle_royale"
  | "darts_racer"
  | "bowling"
  | "baseball"
  | "shooter"
  | "prisoner"
  | "president"
  | "attrape_moi"
  | "halve_it"
  | "bobs_27"
  | "count_up"
  | "super_bull"
  | "knockout"
  | "tic_tac_toe"
  | "happy_mille"
  | "enculette"
  | "capital"
  | "rugby"
  | "football_darts"
  | "fun_gages"
  | "game_170"
  | "territories"
  | "darts_firefighter"
  | "darts_poker"
  | "cargo"
  | "ocean_control"
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
  config?: any;
  stateSnapshot?: any;
  finalTerritories?: any[];
  visits?: any[];
  stats?: any;
  compact: CompactMatchV1;
};

const NUMERIC_HINTS = [
  "score", "points", "marks", "darts", "dart", "avg", "mpr", "ppd", "best", "checkout", "co",
  "win", "wins", "loss", "losses", "rank", "legs", "sets", "kills", "hit", "hits", "miss", "misses",
  "bull", "dbull", "shield", "resurrection", "damage", "streak", "round", "turn", "visit", "duration",
  "assist", "goal", "goals", "penalty", "fanny", "mene", "throw", "throws", "closed", "open",
  "single", "double", "triple", "fire", "water", "smoke", "protect", "extinguish", "spread",
  "canadair", "critical", "useless", "perfect", "accuracy", "hand", "card", "choice", "exchange", "joker",
  "cargo", "weight", "pallet", "contract", "parcel", "overload", "series", "crate", "carton", "route", "fragile", "urgent",
  "ocean", "ship", "ships", "sunk", "sonar", "contact", "strike", "duplicate", "cell", "fleet"
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

function stripHeavy(value: any, depth = 0, seen?: WeakSet<object>): any {
  if (value == null) return value;
  if (depth > 8) return undefined;
  if (value && typeof value === "object") {
    const guard = seen || new WeakSet<object>();
    if (guard.has(value)) return undefined;
    guard.add(value);
    seen = guard;
  }
  if (typeof value === "string") {
    if (value.startsWith("data:image") || value.length > 512) return undefined;
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    // On conserve les tableaux statistiques, mais on évite les explosions de payload.
    const max = depth <= 3 ? 500 : 160;
    return value.slice(-max).map((x) => stripHeavy(x, depth + 1, seen)).filter((x) => x !== undefined);
  }
  if (isPlainObject(value)) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (DROP_KEYS.has(k)) continue;
      const sv = stripHeavy(v, depth + 1, seen);
      if (sv !== undefined) out[shortKey(k)] = sv;
    }
    return out;
  }
  return undefined;
}

function stripHeavyPreserveKeys(value: any, depth = 0, seen?: WeakSet<object>): any {
  if (value == null) return value;
  if (depth > 10) return undefined;
  if (value && typeof value === "object") {
    const guard = seen || new WeakSet<object>();
    if (guard.has(value)) return undefined;
    guard.add(value);
    seen = guard;
  }
  if (typeof value === "string") {
    if (value.startsWith("data:image") || value.length > 1024) return undefined;
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    const max = depth <= 4 ? 1200 : 400;
    return value.slice(-max).map((item) => stripHeavyPreserveKeys(item, depth + 1, seen)).filter((item) => item !== undefined);
  }
  if (isPlainObject(value)) {
    const out: Record<string, any> = {};
    for (const [key, nested] of Object.entries(value)) {
      if (DROP_KEYS.has(key)) continue;
      const clean = stripHeavyPreserveKeys(nested, depth + 1, seen);
      if (clean !== undefined) out[key] = clean;
    }
    return out;
  }
  return undefined;
}

function inferMode(rec: any, payload: any): CompactMatchMode {
  const raw = [
    rec?.kind,
    rec?.mode,
    payload?.kind,
    payload?.mode,
    rec?.summary?.kind,
    rec?.summary?.mode,
    rec?.summary?.title,
    payload?.summary?.kind,
    payload?.summary?.mode,
    payload?.summary?.title,
    rec?.game?.mode,
    rec?.game,
    payload?.game?.mode,
    payload?.game,
    payload?.config?.mode,
    payload?.options?.mode,
  ].filter((v) => v !== undefined && v !== null).map((v) => String(v).toLowerCase()).join(" ");

  // Les modes dérivés de X01 (notamment LES 5 VIES) doivent être testés avant
  // X01 : certains anciens identifiants commencent par `x01-...`.
  if (raw.includes("five_lives") || raw.includes("five lives") || raw.includes("5 vies") || raw.includes("cinq vies")) return "five_lives";
  if (raw.includes("loterie") || raw.includes("lottery")) return "loterie";
  if (raw.includes("warfare")) return "warfare";
  if (raw.includes("battle_royale") || raw.includes("battle royale")) return "battle_royale";
  if (raw.includes("darts_racer") || raw.includes("darts racer")) return "darts_racer";
  if (raw.includes("darts_poker") || raw.includes("darts poker") || raw.includes("dartspoker")) return "darts_poker";
  if (raw.includes("ocean_control") || raw.includes("ocean control") || raw.includes("oceancontrol")) return "ocean_control";
  if (raw.includes("cargo")) return "cargo";
  if (raw.includes("bowling")) return "bowling";
  if (raw.includes("baseball")) return "baseball";
  if (raw.includes("shooter")) return "shooter";
  if (raw.includes("prisoner")) return "prisoner";
  if (raw.includes("president") || raw.includes("président")) return "president";
  if (raw.includes("attrape")) return "attrape_moi";
  if (raw.includes("halve")) return "halve_it";
  if (raw.includes("bobs") || raw.includes("bob's")) return "bobs_27";
  if (raw.includes("count_up") || raw.includes("count-up")) return "count_up";
  if (raw.includes("super_bull") || raw.includes("super bull")) return "super_bull";
  if (raw.includes("knockout")) return "knockout";
  if (raw.includes("tic_tac_toe") || raw.includes("tic-tac-toe")) return "tic_tac_toe";
  if (raw.includes("happy_mille") || raw.includes("happy mille")) return "happy_mille";
  if (raw.includes("enculette")) return "enculette";
  if (raw.includes("capital")) return "capital";
  if (raw.includes("rugby")) return "rugby";
  if (raw.includes("football") && !raw.includes("baby")) return "football_darts";
  if (raw.includes("fun_gages") || raw.includes("fun gages")) return "fun_gages";
  if (raw.includes("game_170") || raw.includes(" 170")) return "game_170";
  if (raw.includes("cricket")) return "cricket";
  if (raw.includes("killer")) return "killer";
  if (raw.includes("golf")) return "golf";
  if (raw.includes("shanghai")) return "shanghai";
  if (raw.includes("darts_firefighter") || raw.includes("darts firefighter") || raw.includes("firefighter")) return "darts_firefighter";
  if (raw.includes("territ")) return "territories";
  if (raw.includes("scram")) return "scram";
  if (raw.includes("batard") || raw.includes("bastard")) return "batard";
  if (raw.includes("baby") || raw.includes("foot")) return "babyfoot";
  if (raw.includes("petanque") || raw.includes("pétanque")) return "petanque";
  if (raw.includes("molkky") || raw.includes("mölkky")) return "molkky";
  if (raw.includes("ping") || raw.includes("pong")) return "pingpong";
  if (raw.includes("dice") || raw.includes("yams") || raw.includes("yam")) return "dice";
  if (raw.includes("training") || raw.includes("entrain")) return "training";
  if (raw.includes("x01") || raw.includes("301") || raw.includes("501")) return "x01";
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
    // Descripteurs simples d'abord, puis statistiques riches ensuite : pushOne()
    // fusionne par id et les dernières sources complètent/écrasent les champs.
    rec?.players,
    rec?.summary?.players,
    payload?.players,
    payload?.state?.players,
    payload?.summary?.players,
    payload?.result?.players,
    payload?.match?.players,
    payload?.config?.players,
    payload?.cfg?.players,
    payload?.teams,
    payload?.state?.teams,
    payload?.summary?.teams,

    rec?.stats?.players,
    rec?.perPlayer,
    rec?.rankings,
    rec?.entities,
    rec?.standings,
    rec?.detailedByPlayer,
    rec?.summary?.perPlayer,
    rec?.summary?.rankings,
    rec?.summary?.entities,
    rec?.summary?.standings,
    rec?.summary?.detailedByPlayer,
    payload?.finalPlayers,
    payload?.stats?.players,
    payload?.statsIndex?.players,
    payload?.perPlayer,
    payload?.rankings,
    payload?.entities,
    payload?.standings,
    payload?.detailedByPlayer,
    payload?.summary?.perPlayer,
    payload?.summary?.rankings,
    payload?.summary?.entities,
    payload?.summary?.standings,
    payload?.summary?.detailedByPlayer,
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
  // Canonical telemetry shared by every Darts mode. The detailed payload remains
  // the source of truth; this compact copy keeps the ordered path available to
  // StatsHub/imports even when only the compact record is loaded.
  const telemetryVisits = payload?.telemetry?.visits ?? payload?.dartTelemetry?.visits;
  if (Array.isArray(telemetryVisits) && telemetryVisits.length) {
    out.tv = telemetryVisits.slice(-5000).map((v: any) => {
      const pid = v?.playerId ?? v?.profileId ?? v?.by;
      return {
        ...(pid != null ? { p: indexOf(pid) } : {}),
        ...(v?.visitIndex != null ? { i: toNum(v.visitIndex) ?? v.visitIndex } : {}),
        ...(v?.roundIndex != null ? { r: toNum(v.roundIndex) ?? v.roundIndex } : {}),
        ...(v?.score != null ? { s: toNum(v.score) ?? v.score } : {}),
        ...(v?.startedAt != null ? { a: toNum(v.startedAt) ?? v.startedAt } : {}),
        ...(v?.endedAt != null ? { z: toNum(v.endedAt) ?? v.endedAt } : {}),
        ...(v?.bust ? { b: 1 } : {}),
        d: Array.isArray(v?.darts)
          ? v.darts.map((d: any) => String(d?.label ?? d?.code ?? d?.segment ?? "")).filter(Boolean)
          : [],
      };
    });
  }
  const state = payload.finalState ?? payload.state ?? payload.result ?? payload.summary;
  const cleanState = stripHeavy(state);
  if (cleanState && Object.keys(cleanState || {}).length) out.s = cleanState;
  if (mode === "x01") {
    const legs = payload.legs ?? payload.sets ?? payload.legResults;
    if (legs) out.l = stripHeavy(legs);
  }

  // DARTS POKER : préserver le marché, les mains, le sabot, les pouvoirs,
  // les showdowns et la télémétrie pour une reprise et des statistiques exactes.
  if (mode === "darts_poker") {
    const summary = payload?.summary && typeof payload.summary === "object" ? payload.summary : {};
    const matchStats = payload?.stats?.match ?? payload?.stats?.global ?? summary?.matchStats ?? {};
    const snapshot = payload?.stateSnapshot ?? payload?.resume?.state ?? null;
    const pokerRounds = payload?.rounds ?? summary?.rounds ?? snapshot?.rounds ?? [];
    const pokerVisits = payload?.visitHistory ?? payload?.visits ?? summary?.visits ?? snapshot?.visits ?? [];
    out.pk = {
      config: stripHeavyPreserveKeys(payload?.config ?? snapshot?.config ?? {}),
      stateSnapshot: snapshot ? stripHeavyPreserveKeys(snapshot) : undefined,
      rounds: stripHeavyPreserveKeys(pokerRounds),
      visits: stripHeavyPreserveKeys(pokerVisits),
      matchStats: stripHeavyPreserveKeys(matchStats),
      summary: stripHeavyPreserveKeys({
        winnerId: summary?.winnerId,
        winnerIds: summary?.winnerIds,
        winnerName: summary?.winnerName,
        roundsPlayed: summary?.roundsPlayed ?? matchStats?.roundsPlayed,
        configuredRounds: summary?.configuredRounds,
        dartsPerHand: summary?.dartsPerHand,
        scoreLine: summary?.scoreLine,
        durationMs: summary?.durationMs ?? matchStats?.durationMs,
      }),
    };
  }

  // DARTS FOOTBALL : préserver le terrain, la possession, les tirs, le gardien
  // et le journal exact afin qu'une partie compacte reste reprenable.
  if (mode === "football_darts") {
    const summary = payload?.summary && typeof payload.summary === "object" ? payload.summary : {};
    const matchStats = payload?.stats?.match ?? payload?.stats?.global ?? summary?.matchStats ?? {};
    const snapshot = payload?.stateSnapshot ?? payload?.resume?.state ?? null;
    const footballVisits = payload?.visitHistory ?? payload?.visits ?? summary?.visits ?? snapshot?.visits ?? [];
    out.fb = {
      config: stripHeavyPreserveKeys(payload?.config ?? snapshot?.config ?? {}),
      stateSnapshot: snapshot ? stripHeavyPreserveKeys(snapshot) : undefined,
      visits: stripHeavyPreserveKeys(footballVisits),
      matchStats: stripHeavyPreserveKeys(matchStats),
      summary: stripHeavyPreserveKeys({
        winnerId: summary?.winnerId,
        winnerIds: summary?.winnerIds,
        winnerSideIds: summary?.winnerSideIds,
        winnerName: summary?.winnerName,
        draw: summary?.draw,
        variant: summary?.variant ?? payload?.config?.variant,
        scoreBySide: summary?.scoreBySide,
        scoreLine: summary?.scoreLine,
        durationMs: summary?.durationMs ?? matchStats?.durationMs,
      }),
    };
  }

  // OCEAN CONTROL : préserver la flotte, les impacts, le sonar et la bataille active.
  // La partie compacte reste ainsi reprenable à la case et au tour exacts.
  if (mode === "ocean_control") {
    const summary = payload?.summary && typeof payload.summary === "object" ? payload.summary : {};
    const matchStats = payload?.stats?.match ?? payload?.stats?.global ?? summary?.matchStats ?? {};
    const snapshot = payload?.stateSnapshot ?? payload?.resume?.state ?? null;
    const oceanVisits = payload?.visitHistory ?? payload?.visits ?? summary?.visits ?? snapshot?.visits ?? [];
    out.oc = {
      config: stripHeavyPreserveKeys(payload?.config ?? snapshot?.config ?? {}),
      stateSnapshot: snapshot ? stripHeavyPreserveKeys(snapshot) : undefined,
      visits: stripHeavyPreserveKeys(oceanVisits),
      matchStats: stripHeavyPreserveKeys(matchStats),
      summary: stripHeavyPreserveKeys({
        winnerId: summary?.winnerId,
        winnerIds: summary?.winnerIds,
        winnerOwnerIds: summary?.winnerOwnerIds,
        winnerName: summary?.winnerName,
        variant: summary?.variant ?? payload?.config?.variant,
        battlesPlayed: summary?.battlesPlayed ?? matchStats?.battles,
        configuredWins: summary?.configuredWins ?? payload?.config?.winsNeeded,
        shipsSunk: summary?.shipsSunk ?? matchStats?.shipsSunk,
        totalHits: summary?.totalHits ?? matchStats?.totalHits,
        totalDarts: summary?.totalDarts ?? matchStats?.totalDarts,
        scoreLine: summary?.scoreLine,
        durationMs: summary?.durationMs ?? matchStats?.durationMs,
      }),
    };
  }

  // CARGO : préserver le camion, les contrats, les séries et le journal complet.
  // La sauvegarde compacte reste ainsi reprenable sans reconstruire le moteur.
  if (mode === "cargo") {
    const summary = payload?.summary && typeof payload.summary === "object" ? payload.summary : {};
    const matchStats = payload?.stats?.match ?? payload?.stats?.global ?? summary?.matchStats ?? {};
    const snapshot = payload?.stateSnapshot ?? payload?.resume?.state ?? null;
    const cargoVisits = payload?.visitHistory ?? payload?.visits ?? summary?.visits ?? snapshot?.visits ?? [];
    out.cg = {
      config: stripHeavyPreserveKeys(payload?.config ?? snapshot?.config ?? {}),
      stateSnapshot: snapshot ? stripHeavyPreserveKeys(snapshot) : undefined,
      visits: stripHeavyPreserveKeys(cargoVisits),
      matchStats: stripHeavyPreserveKeys(matchStats),
      summary: stripHeavyPreserveKeys({
        winnerId: summary?.winnerId,
        winnerIds: summary?.winnerIds,
        winnerName: summary?.winnerName,
        variant: summary?.variant ?? payload?.config?.variant,
        roundsPlayed: summary?.roundsPlayed ?? matchStats?.roundsPlayed,
        configuredRounds: summary?.configuredRounds ?? payload?.config?.rounds,
        totalWeight: summary?.totalWeight ?? matchStats?.totalWeight,
        parcelsDelivered: summary?.parcelsDelivered ?? matchStats?.parcelsDelivered,
        pallets: summary?.pallets ?? matchStats?.pallets,
        scoreLine: summary?.scoreLine,
        durationMs: summary?.durationMs ?? matchStats?.durationMs,
      }),
    };
  }

  // DARTS FIREFIGHTER : préserver la mission complète avec ses noms de champs.
  // Cela permet aux sauvegardes compactes de restaurer la carte en cours et de
  // reconstruire les statistiques détaillées sans dépendre du payload lourd.
  if (mode === "darts_firefighter") {
    const summary = payload?.summary && typeof payload.summary === "object" ? payload.summary : {};
    const matchStats = payload?.stats?.match ?? payload?.stats?.global ?? summary?.matchStats ?? {};
    const snapshot = payload?.stateSnapshot ?? payload?.resume?.state ?? null;
    const finalTerritories = payload?.finalTerritories ?? summary?.finalTerritories ?? snapshot?.territories ?? [];
    const firefighterVisits = payload?.visitHistory ?? payload?.visits ?? summary?.visits ?? snapshot?.history ?? [];
    out.ff = {
      config: stripHeavyPreserveKeys(payload?.config ?? snapshot?.config ?? {}),
      stateSnapshot: snapshot ? stripHeavyPreserveKeys(snapshot) : undefined,
      finalTerritories: stripHeavyPreserveKeys(finalTerritories),
      visits: stripHeavyPreserveKeys(firefighterVisits),
      matchStats: stripHeavyPreserveKeys(matchStats),
      summary: stripHeavyPreserveKeys({
        won: payload?.won ?? summary?.won,
        finishReason: payload?.finishReason ?? summary?.finishReason,
        score: summary?.score ?? matchStats?.score,
        mapId: summary?.mapId ?? payload?.config?.mapId,
        difficulty: summary?.difficulty ?? payload?.config?.difficulty,
        roundsPlayed: summary?.roundsPlayed ?? matchStats?.roundsPlayed,
        durationMs: summary?.durationMs ?? matchStats?.durationMs,
        totalExtinguished: summary?.totalExtinguished ?? matchStats?.totalExtinguished,
        totalDestroyed: summary?.totalDestroyed ?? matchStats?.totalDestroyed,
        totalSpread: summary?.totalSpread ?? matchStats?.totalSpread,
        propagationBlocked: summary?.propagationBlocked ?? matchStats?.propagationBlocked,
        scoreLine: summary?.scoreLine,
      }),
    };
  }

  // LES 5 VIES : conserver un journal compact permettant de reconstruire les KPI
  // même si un snapshot futur ne garde plus le payload détaillé.
  if (mode === "five_lives") {
    const events = payload.visitHistory ?? payload.events;
    if (Array.isArray(events) && events.length) {
      out.fe = events.slice(-1200).map((e: any) => {
        if (!e || typeof e !== "object") return e;
        const pid = e.playerId ?? e.profileId ?? e.id ?? e.pid;
        const darts = Array.isArray(e.darts)
          ? e.darts.map((d: any) => {
              if (typeof d === "string") return d;
              const value = Number(d?.v ?? d?.value ?? d?.segment ?? 0);
              const mult = Number(d?.mult ?? d?.multiplier ?? 1);
              if (!value) return "MISS";
              if (value === 25) return mult === 2 ? "DBULL" : "BULL";
              return `${mult === 3 ? "T" : mult === 2 ? "D" : "S"}${value}`;
            })
          : [];
        return {
          ...(pid != null ? { p: indexOf(pid) } : {}),
          ...(e.score != null ? { sc: toNum(e.score) ?? e.score } : {}),
          ...(e.target != null ? { tar: toNum(e.target) ?? e.target } : {}),
          ...(e.required != null ? { req: toNum(e.required) ?? e.required } : {}),
          ...(e.margin != null ? { mar: toNum(e.margin) ?? e.margin } : {}),
          ...(e.success != null ? { ok: !!e.success } : {}),
          ...(e.openingVisit != null ? { op: !!e.openingVisit } : {}),
          ...(e.lifeLost != null ? { lost: !!e.lifeLost } : {}),
          ...(e.livesBefore != null ? { lb: toNum(e.livesBefore) ?? e.livesBefore } : {}),
          ...(e.livesAfter != null ? { la: toNum(e.livesAfter) ?? e.livesAfter } : {}),
          ...(darts.length ? { ds: darts } : {}),
          ...(e.inputMethod ? { im: String(e.inputMethod).slice(0, 24) } : {}),
          ...(e.at != null ? { at: toNum(e.at) ?? e.at } : {}),
        };
      });
    }
  }

  // Cricket: conserver le journal fléchette par fléchette.
  // C'est la seule source fiable pour reconstruire plus tard S/D/T, MISS,
  // Bull/DBull, best visit, hit-rate, damage cut-throat, etc.
  // Ancien bug: payload.cricketEvents existait dans CricketPlay mais le compacteur
  // ne le recopiait pas dans compact.d, donc l'export/snapshot ne gardait que des
  // agrégats impossibles à détailler.
  if (mode === "cricket") {
    const ev =
      payload.cricketEvents ??
      payload.cricketDartLog ??
      payload.dartLog ??
      payload.events ??
      payload.stats?.cricketEvents ??
      payload.stats?.dartLog;
    if (Array.isArray(ev) && ev.length) {
      out.ce = ev.slice(-2500).map((e: any) => {
        if (!e || typeof e !== "object") return e;
        const pid = e.playerId ?? e.profileId ?? e.id ?? e.pid;
        return {
          ...(pid != null ? { p: indexOf(pid) } : {}),
          ...(e.visitIndex != null ? { v: toNum(e.visitIndex) ?? e.visitIndex } : {}),
          ...(e.dartIndex != null ? { d: toNum(e.dartIndex) ?? e.dartIndex } : {}),
          ...(e.segment != null ? { s: e.segment } : {}),
          ...(e.ring != null ? { r: e.ring } : {}),
          ...(e.marks != null ? { m: toNum(e.marks) ?? e.marks } : {}),
          ...(e.rawScore != null ? { rs: toNum(e.rawScore) ?? e.rawScore } : {}),
          ...(e.scoredPoints != null ? { pts: toNum(e.scoredPoints) ?? e.scoredPoints } : {}),
          ...(e.inflictedPoints != null ? { inf: toNum(e.inflictedPoints) ?? e.inflictedPoints } : {}),
          ...(e.beforeMarksOnSegment != null ? { bm: toNum(e.beforeMarksOnSegment) ?? e.beforeMarksOnSegment } : {}),
          ...(e.afterMarksOnSegment != null ? { am: toNum(e.afterMarksOnSegment) ?? e.afterMarksOnSegment } : {}),
          ...(e.closedSegmentNow != null ? { cl: !!e.closedSegmentNow } : {}),
          ...(e.winningThrow != null ? { w: !!e.winningThrow } : {}),
          ...(e.timestamp != null ? { t: toNum(e.timestamp) ?? e.timestamp } : {}),
        };
      });
    }
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
      const firstNum = (...values: any[]) => {
        for (const value of values) {
          const num = toNum(value);
          if (num !== undefined) return num;
        }
        return undefined;
      };

      if (mode === "five_lives") {
        const modeStats: Array<[string, number | undefined]> = [
          ["fl_vis", firstNum(pl?.visits, pl?.turns, pl?.rounds)],
          ["fl_tar", firstNum(pl?.targetsFaced)],
          ["fl_suc", firstNum(pl?.successfulVisits, pl?.successes, pl?.validHits)],
          ["fl_fail", firstNum(pl?.failedVisits, pl?.fails)],
          ["fl_lost", firstNum(pl?.livesLost, pl?.lostLives, pl?.damageTaken)],
          ["fl_dt", firstNum(pl?.dartsThrown, pl?.darts, pl?.totalThrows)],
          ["fl_pts", firstNum(pl?.totalScore, pl?.score, pl?.points)],
          ["fl_best", firstNum(pl?.bestVisit)],
          ["fl_mar", firstNum(pl?.bestMargin)],
          ["fl_s", firstNum(pl?.singles)],
          ["fl_d", firstNum(pl?.doubles)],
          ["fl_t", firstNum(pl?.triples)],
          ["fl_b", firstNum(pl?.bulls)],
          ["fl_db", firstNum(pl?.dbulls)],
          ["fl_mis", firstNum(pl?.misses)],
          ["fl_hit", firstNum(pl?.hitsTotal)],
          ["fl_so", firstNum(pl?.scoreOnlyVisits)],
        ];
        for (const [key, value] of modeStats) if (value !== undefined) n[key] = value;
      }

      if (mode === "loterie") {
        const modeStats: Array<[string, number | undefined]> = [
          ["lo_vis", firstNum(pl?.visits, pl?.turns, pl?.rounds)],
          ["lo_suc", firstNum(pl?.successfulVisits, pl?.hitCount, pl?.hits)],
          ["lo_emp", firstNum(pl?.emptyVisits, pl?.misses)],
          ["lo_cells", firstNum(pl?.cellsRevealed, pl?.score, pl?.points)],
          ["lo_dt", firstNum(pl?.dartsThrown, pl?.darts)],
          ["lo_multi", firstNum(pl?.multiHits)],
          ["lo_maxc", firstNum(pl?.maxCellsInVisit)],
          ["lo_str", firstNum(pl?.bestStreak)],
          ["lo_tv", firstNum(pl?.totalVolleyScore)],
          ["lo_maxv", firstNum(pl?.maxVolley)],
          ["lo_cards", firstNum(pl?.cardsCount, pl?.cardsPlayed, Array.isArray(pl?.cards) ? pl.cards.length : undefined)],
          ["lo_done", firstNum(pl?.cardsCompleted)],
          ["lo_bcp", firstNum(pl?.bestCardProgress)],
          ["lo_cpc", firstNum(pl?.cellsPerCard)],
          ["lo_s", firstNum(pl?.singles)],
          ["lo_d", firstNum(pl?.doubles)],
          ["lo_t", firstNum(pl?.triples)],
          ["lo_b", firstNum(pl?.bulls)],
          ["lo_db", firstNum(pl?.dbulls)],
          ["lo_mis", firstNum(pl?.dartMisses, pl?.misses)],
        ];
        for (const [key, value] of modeStats) if (value !== undefined) n[key] = value;
      }

      if (mode === "football_darts") {
        const modeStats: Array<[string, number | undefined]> = [
          ["fb_vis", firstNum(pl?.visits)],
          ["fb_dt", firstNum(pl?.darts, pl?.dartsThrown)],
          ["fb_hit", firstNum(pl?.hits, pl?.hitsTotal)],
          ["fb_mis", firstNum(pl?.misses)],
          ["fb_s", firstNum(pl?.singles)],
          ["fb_d", firstNum(pl?.doubles)],
          ["fb_t", firstNum(pl?.triples)],
          ["fb_b", firstNum(pl?.bulls)],
          ["fb_db", firstNum(pl?.dbulls)],
          ["fb_act", firstNum(pl?.successfulActions)],
          ["fb_adv", firstNum(pl?.advances)],
          ["fb_pass", firstNum(pl?.passes)],
          ["fb_tac", firstNum(pl?.tackles)],
          ["fb_int", firstNum(pl?.interceptions)],
          ["fb_sh", firstNum(pl?.shots)],
          ["fb_sot", firstNum(pl?.shotsOnTarget)],
          ["fb_g", firstNum(pl?.goals)],
          ["fb_sv", firstNum(pl?.saves)],
          ["fb_pw", firstNum(pl?.possessionWins)],
          ["fb_pl", firstNum(pl?.possessionLosses)],
          ["fb_bp", firstNum(pl?.bestProgress)],
        ];
        for (const [key, value] of modeStats) if (value !== undefined) n[key] = value;
      }

      if (mode === "cricket") {
        // Compteurs de bagues garantis dans le compact. Ils complètent compact.d.ce
        // et restent disponibles même si une sauvegarde allégée retire le journal.
        const hs = pl?.hitSummary ?? pl?.special?.hitSummary ?? pl?.cricketStats?.hitSummary ?? null;
        const br = pl?.cricketStats?.byRing ?? hs?.byRing ?? null;
        const ringStats: Array<[string, number | undefined]> = [
          ["cr_s", firstNum(hs?.S, hs?.s, br?.S, br?.s)],
          ["cr_d", firstNum(hs?.D, hs?.d, br?.D, br?.d)],
          ["cr_t", firstNum(hs?.T, hs?.t, br?.T, br?.t)],
          ["cr_b", firstNum(hs?.BULL, hs?.bull, br?.BULL, br?.bull, br?.SBULL, br?.SB)],
          ["cr_db", firstNum(hs?.DBULL, hs?.dbull, br?.DBULL, br?.DB)],
          ["cr_mis", firstNum(hs?.MISS, hs?.miss, hs?.misses, br?.MISS, br?.miss)],
        ];
        for (const [key, value] of ringStats) if (value !== undefined) n[key] = value;
      }
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
      if (compact.m === "darts_firefighter") {
        const n = ps.n || {};
        const alias = (target: string, ...keys: string[]) => {
          for (const key of keys) {
            if (n[key] != null) { out[target] = n[key]; return; }
          }
        };
        alias("darts", "dt", "darts");
        alias("hits", "hit", "hits");
        alias("singles", "singles");
        alias("doubles", "doubles");
        alias("triples", "triples");
        alias("bulls", "bulls");
        alias("dbulls", "dbulls");
        alias("misses", "mis", "misses");
        alias("waterApplied", "waterapplied");
        alias("fireReduced", "firereduced");
        alias("firesExtinguished", "firesextinguished");
        alias("smokeCleared", "smokecleared");
        alias("protectionsPlaced", "protectionsplaced");
        alias("propagationBlocked", "propagationblocked");
        alias("uselessDarts", "uselessdarts");
        alias("bestVisitScore", "bestvisitscore", "bv");
        alias("perfectVisits", "perfectvisits");
        alias("criticalInterventions", "criticalinterventio");
      }
      if (compact.m === "ocean_control") {
        const n = ps.n || {};
        const c = ps.c || {};
        const alias = (target: string, ...keys: string[]) => {
          for (const key of keys) {
            if (n[key] != null) { out[target] = n[key]; return; }
            if (c[key] != null) { out[target] = c[key]; return; }
          }
        };
        alias("darts", "dt", "darts");
        alias("visits", "vis", "visits");
        alias("validShots", "validshots");
        alias("duplicateShots", "duplicateshots");
        alias("waterShots", "watershots");
        alias("shipHits", "shiphits", "hit", "hits");
        alias("shipsSunk", "shipssunk");
        alias("sonarUses", "sonaruses");
        alias("sonarContacts", "sonarcontacts");
        alias("precisionStrikes", "precisionstrikes");
        alias("cellsAffected", "cellsaffected");
        alias("singles", "singles");
        alias("doubles", "doubles");
        alias("triples", "triples");
        alias("bulls", "bulls");
        alias("dbulls", "dbulls");
        alias("misses", "mis", "misses");
      }
      if (compact.m === "cargo") {
        const n = ps.n || {};
        const c = ps.c || {};
        const alias = (target: string, ...keys: string[]) => {
          for (const key of keys) {
            if (n[key] != null) { out[target] = n[key]; return; }
            if (c[key] != null) { out[target] = c[key]; return; }
          }
        };
        alias("darts", "dt", "darts");
        alias("visits", "vis", "visits");
        alias("hits", "hit", "hits");
        alias("singles", "singles");
        alias("doubles", "doubles");
        alias("triples", "triples");
        alias("bulls", "bulls");
        alias("dbulls", "dbulls");
        alias("misses", "mis", "misses");
        alias("totalWeight", "totalweight", "sc", "score");
        alias("pallets", "pallets");
        alias("cartons", "cartons");
        alias("crates", "crates");
        alias("completedContracts", "completedcontracts");
        alias("failedContracts", "failedcontracts");
        alias("fragileCompleted", "fragilecompleted");
        alias("fragileBroken", "fragilebroken");
        alias("urgentCompleted", "urgentcompleted");
        alias("lostWeight", "lostweight");
        alias("rejectedWeight", "rejectedweight");
        alias("overloads", "overloads");
        alias("perfectLoads", "perfectloads");
        alias("longestSeries", "longestseries");
        alias("bestPalletWeight", "bestpalletweight");
        alias("parcelsDelivered", "parcelsdelivered");
        alias("parcelDeliveries", "parceldeliveries");
        alias("parcelBonuses", "parcelbonuses");
        alias("routeStagesCompleted", "routestagescomplet");
      }
      if (compact.m === "football_darts") {
        const n = ps.n || {};
        const c = ps.c || {};
        const alias = (target: string, ...keys: string[]) => {
          for (const key of keys) {
            if (n[key] != null) { out[target] = n[key]; return; }
            if (c[key] != null) { out[target] = c[key]; return; }
          }
        };
        alias("darts", "fb_dt", "dt", "darts");
        alias("visits", "fb_vis", "vis", "visits");
        alias("hits", "fb_hit", "hit", "hits");
        alias("successfulActions", "fb_act", "successfulactions");
        alias("goals", "fb_g", "goals");
        alias("shots", "fb_sh", "shots");
        alias("shotsOnTarget", "fb_sot", "shotsontarget");
        alias("saves", "fb_sv", "saves");
        alias("tackles", "fb_tac", "tackles");
        alias("interceptions", "fb_int", "interceptions");
        alias("advances", "fb_adv", "advances");
        alias("passes", "fb_pass", "passes");
        alias("bestProgress", "fb_bp", "bestprogress");
        alias("possessionWins", "fb_pw", "possessionwins");
        alias("possessionLosses", "fb_pl", "possessionlosses");
        alias("singles", "fb_s", "singles");
        alias("doubles", "fb_d", "doubles");
        alias("triples", "fb_t", "triples");
        alias("bulls", "fb_b", "bulls");
        alias("dbulls", "fb_db", "dbulls");
        alias("misses", "fb_mis", "mis", "misses");
      }
      if (compact.m === "darts_poker") {
        const n = ps.n || {};
        const c = ps.c || {};
        const alias = (target: string, ...keys: string[]) => {
          for (const key of keys) {
            if (n[key] != null) { out[target] = n[key]; return; }
            if (c[key] != null) { out[target] = c[key]; return; }
          }
        };
        alias("darts", "dt", "darts");
        alias("hits", "hit", "hits");
        alias("singles", "singles");
        alias("doubles", "doubles");
        alias("triples", "triples");
        alias("bulls", "bulls");
        alias("dbulls", "dbulls");
        alias("misses", "mis", "misses");
        alias("cardsCollected", "cardscollected");
        alias("autoDraws", "autodraws");
        alias("exchangesEarned", "exchangesearned");
        alias("exchangesUsed", "exchangesused");
        alias("choicesEarned", "choicesearned");
        alias("choicesUsed", "choicesused");
        alias("jokers", "jokers");
        alias("handsPlayed", "handsplayed");
        alias("handsWon", "handswon");
        alias("handsTied", "handstied");
        alias("bestHandScore", "besthandscore");
        alias("bestHandLabel", "besthandlabel");
        alias("pairs", "pairs");
        alias("twoPairs", "twopairs");
        alias("threeOfAKinds", "threeofakinds");
        alias("straights", "straights");
        alias("flushes", "flushes");
        alias("fullHouses", "fullhouses");
        alias("fourOfAKinds", "fourofakinds");
        alias("straightFlushes", "straightflushes");
        alias("royalFlushes", "royalflushes");
      }
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
    const firefighter = compact.m === "darts_firefighter" && compact.d?.ff && typeof compact.d.ff === "object" ? compact.d.ff : null;
    const poker = compact.m === "darts_poker" && compact.d?.pk && typeof compact.d.pk === "object" ? compact.d.pk : null;
    const cargo = compact.m === "cargo" && compact.d?.cg && typeof compact.d.cg === "object" ? compact.d.cg : null;
    const ocean = compact.m === "ocean_control" && compact.d?.oc && typeof compact.d.oc === "object" ? compact.d.oc : null;
    const football = compact.m === "football_darts" && compact.d?.fb && typeof compact.d.fb === "object" ? compact.d.fb : null;
    const summary = {
      players: playersMap,
      perPlayer: players,
      detailedByPlayer,
      winnerId,
      options: compact.o || {},
      compact: true,
      ...(firefighter?.summary || {}),
      ...(firefighter?.matchStats ? { matchStats: firefighter.matchStats } : {}),
      ...(Array.isArray(firefighter?.finalTerritories) ? { finalTerritories: firefighter.finalTerritories } : {}),
      ...(Array.isArray(firefighter?.visits) ? { visits: firefighter.visits } : {}),
      ...(poker?.summary || {}),
      ...(poker?.matchStats ? { matchStats: poker.matchStats } : {}),
      ...(Array.isArray(poker?.rounds) ? { rounds: poker.rounds } : {}),
      ...(Array.isArray(poker?.visits) ? { visits: poker.visits } : {}),
      ...(cargo?.summary || {}),
      ...(cargo?.matchStats ? { matchStats: cargo.matchStats } : {}),
      ...(Array.isArray(cargo?.visits) ? { visits: cargo.visits } : {}),
      ...(ocean?.summary || {}),
      ...(ocean?.matchStats ? { matchStats: ocean.matchStats } : {}),
      ...(Array.isArray(ocean?.visits) ? { visits: ocean.visits } : {}),
      ...(football?.summary || {}),
      ...(football?.matchStats ? { matchStats: football.matchStats } : {}),
      ...(Array.isArray(football?.visits) ? { visits: football.visits } : {}),
    };
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
      summary,
      detail: compact.d,
      ...(firefighter ? {
        config: firefighter.config || compact.o || {},
        stateSnapshot: firefighter.stateSnapshot,
        finalTerritories: Array.isArray(firefighter.finalTerritories) ? firefighter.finalTerritories : [],
        visits: Array.isArray(firefighter.visits) ? firefighter.visits : [],
        stats: { sport: "darts", mode: "darts_firefighter", players, match: firefighter.matchStats || {}, global: firefighter.matchStats || {} },
      } : {}),
      ...(poker ? {
        config: poker.config || compact.o || {},
        stateSnapshot: poker.stateSnapshot,
        visits: Array.isArray(poker.visits) ? poker.visits : [],
        stats: { sport: "darts", mode: "darts_poker", players, match: poker.matchStats || {}, global: poker.matchStats || {} },
      } : {}),
      ...(cargo ? {
        config: cargo.config || compact.o || {},
        stateSnapshot: cargo.stateSnapshot,
        visits: Array.isArray(cargo.visits) ? cargo.visits : [],
        stats: { sport: "darts", mode: "cargo", players, match: cargo.matchStats || {}, global: cargo.matchStats || {} },
      } : {}),
      ...(ocean ? {
        config: ocean.config || compact.o || {},
        stateSnapshot: ocean.stateSnapshot,
        visits: Array.isArray(ocean.visits) ? ocean.visits : [],
        stats: { sport: "darts", mode: "ocean_control", players, match: ocean.matchStats || {}, global: ocean.matchStats || {} },
      } : {}),
      ...(football ? {
        config: football.config || compact.o || {},
        stateSnapshot: football.stateSnapshot,
        visits: Array.isArray(football.visits) ? football.visits : [],
        stats: { sport: "darts", mode: "football", players, match: football.matchStats || {}, global: football.matchStats || {} },
      } : {}),
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
