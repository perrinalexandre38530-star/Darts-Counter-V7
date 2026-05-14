// @ts-nocheck
// =============================================================
// src/lib/onlineStatsExclusions.ts
// Nettoyage statistiques ONLINE — exclusion/restauration sans supprimer
// brutalement les matchs sources.
//
// V7 SAFE : base stable V5 + correction ciblée du dédoublonnage.
// On ne dédoublonne plus avec roomId/lobbyCode ni avec les id trouvés en
// profondeur, car ce sont souvent des salons ou des joueurs et non des matchs.
// Les lignes sans identifiant fort gardent une clé de secours source+date+score
// pour rester sélectionnables sans fusionner plusieurs parties.
// =============================================================

import { History } from "./history";
import { loadStore, scopedStorageKey } from "./storage";

const ONLINE_STATS_EXCLUDED_KEY = "dc_online_stats_excluded_ids_v1";
const ONLINE_MATCHES_KEY = "dc_online_matches_v1";

export type OnlineStatsCleanupSession = {
  id: string;
  matchId: string;
  keys: string[];
  source: "history" | "store" | "localStorage";
  mode: string;
  createdAt: number;
  updatedAt: number;
  playersLabel: string;
  winnerLabel: string;
  scoreLabel?: string;
  detailLabel?: string;
  darts: number;
  avg3: number;
  bestVisit: number;
  bestCheckout: number;
  hitPct?: number;
  excludedFromStats: boolean;
  deletedAt: number | null;
  raw?: any;
};

type ExclusionEntry = {
  excludedAt: number;
  restoredAt?: number;
  reason?: string;
};

type ExclusionMap = Record<string, ExclusionEntry>;

type PlayerAgg = {
  id: string;
  name: string;
  darts: number;
  points: number;
  avg3: number;
  bestVisit: number;
  bestCheckout: number;
  singles: number;
  doubles: number;
  triples: number;
  bull25: number;
  bull50: number;
  miss: number;
  bust: number;
  h50: number;
  h60: number;
  h80: number;
  h100: number;
  h120: number;
  h140: number;
  h180: number;
};

type ExtractedStats = {
  players: PlayerAgg[];
  darts: number;
  points: number;
  avg3: number;
  bestVisit: number;
  bestCheckout: number;
  hits: number;
  miss: number;
  hitPct: number;
  startScore: number;
  scoreLabel: string;
  detailLabel: string;
  quality: number;
  statsSource: string;
};

const nowTs = () => Date.now();

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function storageKeys() {
  const scoped = scopedStorageKey(ONLINE_STATS_EXCLUDED_KEY);
  return scoped === ONLINE_STATS_EXCLUDED_KEY ? [ONLINE_STATS_EXCLUDED_KEY] : [scoped, ONLINE_STATS_EXCLUDED_KEY];
}

function onlineMatchStorageKeys() {
  const scoped = scopedStorageKey(ONLINE_MATCHES_KEY);
  return scoped === ONLINE_MATCHES_KEY ? [ONLINE_MATCHES_KEY] : [scoped, ONLINE_MATCHES_KEY];
}

function readJson<T>(key: string, fallback: T): T {
  try {
    if (!isBrowser()) return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: any) {
  try {
    if (!isBrowser()) return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function asBool(value: any): boolean {
  if (value === true || value === 1) return true;
  const s = String(value ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "on" || s === "excluded" || s === "test";
}

function num(value: any, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round1(value: any): number {
  const n = num(value, 0);
  return Math.round(n * 10) / 10;
}

function str(value: any): string {
  return String(value ?? "").trim();
}

function uniq(list: any[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of list || []) {
    const s = str(item);
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function normKey(v: any): string {
  return String(v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pick(obj: any, aliases: string[], fallback: any = undefined): any {
  if (!obj || typeof obj !== "object") return fallback;
  const wanted = new Set(aliases.map(normKey));
  for (const [k, v] of Object.entries(obj)) {
    if (wanted.has(normKey(k)) && v !== undefined && v !== null && v !== "") return v;
  }
  return fallback;
}

function pickNum(obj: any, aliases: string[], fallback = 0): number {
  const direct = pick(obj, aliases, undefined);
  const n = Number(direct);
  return Number.isFinite(n) ? n : fallback;
}

function pickNestedNum(obj: any, aliases: string[], nestedAliases: string[] = [], fallback = 0): number {
  const direct = pickNum(obj, aliases, NaN);
  if (Number.isFinite(direct)) return direct;
  for (const nestedKey of nestedAliases) {
    const nested = obj?.[nestedKey];
    const n = pickNum(nested, aliases, NaN);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function isPlainObject(x: any): x is Record<string, any> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

function walkObjects(root: any, maxDepth = 7): any[] {
  const out: any[] = [];
  const seen = new WeakSet<object>();
  const skip = /avatar|dataurl|image|photo|thumb|blob|base64|file|bytes/i;

  const walk = (x: any, depth: number, keyHint = "") => {
    if (!x || typeof x !== "object" || depth > maxDepth) return;
    if (seen.has(x)) return;
    if (out.length > 4000) return;
    seen.add(x);
    out.push(x);

    if (Array.isArray(x)) {
      x.slice(0, 300).forEach((v, idx) => walk(v, depth + 1, String(idx)));
      return;
    }

    for (const [key, v] of Object.entries(x)) {
      if (!v || typeof v !== "object") continue;
      if (skip.test(String(key))) continue;
      walk(v, depth + 1, String(key));
    }
  };

  walk(root, 0);
  return out;
}

function deepFirst(row: any, keys: string[]): any {
  const want = new Set(keys.map(normKey));
  for (const obj of walkObjects(row, 7)) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) continue;
    for (const [key, value] of Object.entries(obj)) {
      if (want.has(normKey(key)) && value !== undefined && value !== null && value !== "") return value;
    }
  }
  return undefined;
}

function asArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function objectValues(value: any): any[] {
  return value && typeof value === "object" && !Array.isArray(value) ? Object.values(value) : [];
}

function mapEntries(value: any): [string, any][] {
  return value && typeof value === "object" && !Array.isArray(value) ? Object.entries(value) : [];
}

function playerIdOf(p: any, fallback = ""): string {
  return str(p?.id ?? p?.profileId ?? p?.playerId ?? p?.pid ?? p?.uid ?? p?.player_id ?? fallback);
}

function playerNameOf(p: any, fallback = ""): string {
  return str(p?.name ?? p?.playerName ?? p?.displayName ?? p?.nickname ?? p?.profileName ?? p?.label ?? fallback);
}

function playerShortName(name: string): string {
  const s = str(name);
  if (!s) return "?";
  return s.length > 16 ? `${s.slice(0, 15)}…` : s;
}

function scoreOfDart(d: any): number {
  if (!d || typeof d !== "object") return 0;
  const code = String(d?.code ?? d?.label ?? "").trim().toUpperCase();
  const segRaw = d?.segment ?? d?.value ?? d?.v ?? d?.seg;
  const multRaw = d?.multiplier ?? d?.mult ?? d?.m;
  if (d?.isMiss || d?.ismiss || d?.miss || code === "MISS" || code === "M") return 0;

  const direct = Number(d?.score ?? d?.points);
  if (Number.isFinite(direct) && direct >= 0) return direct;

  const segText = String(segRaw ?? "").trim().toLowerCase();
  const mult = Math.max(1, Number(multRaw || 1) || 1);
  if (!segText || segText === "miss" || segText === "m") return 0;
  if (segText === "bull" || segText === "ob") return 25;
  if (segText === "dbull" || segText === "doublebull" || segText === "ib") return 50;

  const seg = Number(segRaw);
  if (!Number.isFinite(seg) || seg <= 0) return 0;
  if (seg === 25 && mult >= 2) return 50;
  if (seg === 25) return 25;
  return seg * mult;
}

function consumeDart(agg: PlayerAgg, d: any) {
  const sc = scoreOfDart(d);
  const segRaw = d?.segment ?? d?.value ?? d?.v ?? d?.seg;
  const mult = Number(d?.multiplier ?? d?.mult ?? d?.m ?? 1) || 1;
  const code = String(d?.code ?? d?.label ?? "").trim().toUpperCase();
  const segText = String(segRaw ?? "").trim().toLowerCase();
  agg.darts += 1;
  if (d?.isBust || d?.isbust || d?.bust) agg.bust += 1;
  if (sc <= 0 || d?.isMiss || d?.ismiss || d?.miss || code === "MISS" || code === "M" || !segRaw) {
    agg.miss += 1;
    return;
  }
  if (segText === "dbull" || segText === "doublebull" || segText === "ib" || (Number(segRaw) === 25 && mult >= 2)) agg.bull50 += 1;
  else if (segText === "bull" || segText === "ob" || Number(segRaw) === 25) agg.bull25 += 1;
  else if (mult >= 3) agg.triples += 1;
  else if (mult === 2) agg.doubles += 1;
  else agg.singles += 1;
}

function newPlayerAgg(id: string, name = ""): PlayerAgg {
  return {
    id: str(id),
    name: str(name),
    darts: 0,
    points: 0,
    avg3: 0,
    bestVisit: 0,
    bestCheckout: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    bull25: 0,
    bull50: 0,
    miss: 0,
    bust: 0,
    h50: 0,
    h60: 0,
    h80: 0,
    h100: 0,
    h120: 0,
    h140: 0,
    h180: 0,
  };
}

function addToAgg(target: PlayerAgg, patch: Partial<PlayerAgg>) {
  if (!target.name && patch.name) target.name = String(patch.name);
  for (const key of ["darts", "points", "singles", "doubles", "triples", "bull25", "bull50", "miss", "bust", "h50", "h60", "h80", "h100", "h120", "h140", "h180"] as const) {
    const n = Number((patch as any)[key]);
    if (Number.isFinite(n) && n > 0) (target as any)[key] += n;
  }
  for (const key of ["avg3", "bestVisit", "bestCheckout"] as const) {
    const n = Number((patch as any)[key]);
    if (Number.isFinite(n) && n > (target as any)[key]) (target as any)[key] = n;
  }
}

function collectNameMap(row: any): Record<string, string> {
  const out: Record<string, string> = {};
  const add = (p: any, fallbackKey = "") => {
    if (!p || typeof p !== "object") return;
    const id = playerIdOf(p, fallbackKey);
    const name = playerNameOf(p, fallbackKey);
    if (id && name && !out[id]) out[id] = name;
  };

  for (const obj of walkObjects(row, 7)) {
    if (!obj || typeof obj !== "object") continue;
    if (Array.isArray(obj)) obj.forEach((x) => add(x));
    else {
      add(obj);
      for (const key of ["players", "perPlayer", "rankings"]) {
        const arr = obj?.[key];
        if (Array.isArray(arr)) arr.forEach((x) => add(x));
        else if (isPlainObject(arr)) Object.entries(arr).forEach(([k, v]) => add(v, k));
      }
      for (const key of ["detailedByPlayer", "detailedbyplayer", "summaryPlayers", "statsByPlayer", "playersStats"]) {
        const map = obj?.[key];
        if (isPlainObject(map)) Object.entries(map).forEach(([k, v]) => add(v, k));
      }
    }
  }
  return out;
}

function looksLikePlayerStats(x: any): boolean {
  if (!x || typeof x !== "object" || Array.isArray(x)) return false;
  return [
    "darts", "totalDarts", "dartsThrown", "dt", "_sumDarts",
    "points", "totalScore", "_sumPoints", "scored", "avg3", "avg3D",
    "bestVisit", "bv", "bestCheckout", "bestCo", "hits", "buckets",
    "singles", "doubles", "triples", "miss", "misses", "bull", "dBull", "dbull", "bust",
  ].some((k) => x[k] !== undefined && x[k] !== null);
}

function collectPlayerStatsObjects(row: any): Array<{ key: string; value: any }> {
  const out: Array<{ key: string; value: any }> = [];
  const seen = new WeakSet<object>();
  const add = (value: any, key = "") => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    if (seen.has(value)) return;
    if (!looksLikePlayerStats(value)) return;
    seen.add(value);
    out.push({ key, value });
  };

  for (const obj of walkObjects(row, 8)) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) continue;
    add(obj);

    for (const key of ["perPlayer", "players", "rankings", "stats", "playerStats", "statsRows"]) {
      const v = obj?.[key];
      if (Array.isArray(v)) v.forEach((x, i) => add(x, String(x?.id ?? x?.playerId ?? i)));
      else if (isPlainObject(v)) Object.entries(v).forEach(([k, x]) => add(x, k));
    }

    for (const key of ["detailedByPlayer", "detailedbyplayer", "liveStatsByPlayer", "livestatsbyplayer", "statsByPlayer", "statsById", "statsByPlayerId", "summaryPlayers"]) {
      const v = obj?.[key];
      if (isPlainObject(v)) Object.entries(v).forEach(([k, x]) => add(x, k));
    }
  }

  return out;
}

function bucketCountsFromVisits(scores: number[]) {
  const out = { h50: 0, h60: 0, h80: 0, h100: 0, h120: 0, h140: 0, h180: 0 };
  for (const sc of scores || []) {
    const n = Number(sc) || 0;
    if (n >= 50) out.h50 += 1;
    if (n >= 60) out.h60 += 1;
    if (n >= 80) out.h80 += 1;
    if (n >= 100) out.h100 += 1;
    if (n >= 120) out.h120 += 1;
    if (n >= 140) out.h140 += 1;
    if (n >= 180) out.h180 += 1;
  }
  return out;
}

function statsFromObject(st: any, idHint = "", nameHint = ""): PlayerAgg {
  const h = st?.hits || st?.precision || st?.details || st?.breakdown || {};
  const b = st?.buckets || st?.scoreBuckets || {};
  const id = playerIdOf(st, idHint);
  const name = playerNameOf(st, nameHint || idHint);

  const darts = pickNum(st, ["darts", "totalDarts", "totalDartsThrown", "dartsThrown", "dt", "dartsCount", "totalThrows", "_sumDarts"], 0);
  const points = pickNum(st, ["points", "totalScore", "totalscore", "pointsScored", "scored", "score", "rawScore", "_sumPoints"], 0);
  const avg3 = pickNum(st, ["avg3", "avg3D", "moy3", "average3", "avg"], darts > 0 && points > 0 ? (points / darts) * 3 : 0);

  const scores = Array.isArray(st?.scorePerVisit)
    ? st.scorePerVisit.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n))
    : Array.isArray(st?.visitsScores)
    ? st.visitsScores.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n))
    : Array.isArray(st?.visits)
    ? st.visits.map((x: any) => Number(typeof x === "object" ? x?.score ?? x?.points : x)).filter((n: number) => Number.isFinite(n))
    : [];
  const visitBuckets = bucketCountsFromVisits(scores);

  const out = newPlayerAgg(id, name);
  out.darts = darts;
  out.points = points;
  out.avg3 = avg3;
  out.bestVisit = Math.max(
    pickNum(st, ["bestVisit", "bv", "best_visit", "maxVisit", "highestVisit"], 0),
    scores.length ? Math.max(...scores) : 0,
  );
  out.bestCheckout = pickNum(st, ["bestCheckout", "bestCO", "bestCo", "bc", "best_co", "checkout", "bestFinish", "highestCheckout"], 0);
  out.singles = pickNestedNum(st, ["S", "s", "singles", "singleHits", "hitsSingle", "hitsS"], ["hits", "breakdown", "precision"], 0);
  out.doubles = pickNestedNum(st, ["D", "d", "doubles", "doubleHits", "hitsDouble", "hitsD"], ["hits", "breakdown", "precision"], 0);
  out.triples = pickNestedNum(st, ["T", "t", "triples", "tripleHits", "hitsTriple", "hitsT"], ["hits", "breakdown", "precision"], 0);
  out.bull25 = pickNestedNum(st, ["Bull", "bull", "bull25", "bulls", "outerBull"], ["hits", "breakdown", "precision"], 0);
  out.bull50 = pickNestedNum(st, ["DBull", "dbull", "dBull", "bull50", "dbulls", "innerBull"], ["hits", "breakdown", "precision"], 0);
  out.miss = pickNestedNum(st, ["M", "m", "miss", "misses"], ["hits", "breakdown", "precision"], 0);
  out.bust = pickNestedNum(st, ["bust", "busts"], ["hits", "breakdown", "precision"], 0);
  out.h50 = pickNum(b, ["50+", "h50"], pickNum(st, ["h50"], visitBuckets.h50));
  out.h60 = pickNum(b, ["60+", "h60"], pickNum(st, ["h60"], visitBuckets.h60));
  out.h80 = pickNum(b, ["80+", "h80"], pickNum(st, ["h80"], visitBuckets.h80));
  out.h100 = pickNum(b, ["100+", "h100"], pickNum(st, ["h100"], visitBuckets.h100));
  out.h120 = pickNum(b, ["120+", "h120"], pickNum(st, ["h120"], visitBuckets.h120));
  out.h140 = pickNum(b, ["140+", "h140"], pickNum(st, ["h140"], visitBuckets.h140));
  out.h180 = pickNum(b, ["180", "180+", "h180"], pickNum(st, ["h180"], visitBuckets.h180));

  // Certains vieux agrégats n'ont que hits/miss globaux.
  const aggregateHits = pickNestedNum(st, ["hits", "hit", "hitsTotal"], ["breakdown"], 0);
  if (aggregateHits > 0 && out.singles + out.doubles + out.triples + out.bull25 + out.bull50 <= 0) {
    out.singles = aggregateHits;
  }

  return out;
}

function collectLegacyPlayerRows(row: any, names: Record<string, string>): PlayerAgg[] {
  const out: PlayerAgg[] = [];
  const seenLegacy = new WeakSet<object>();

  const consumeLegacy = (legacy: any) => {
    if (!legacy || typeof legacy !== "object" || Array.isArray(legacy) || seenLegacy.has(legacy)) return;
    seenLegacy.add(legacy);
    const ids = uniq([
      ...Object.keys(legacy.darts || {}),
      ...Object.keys(legacy.points || {}),
      ...Object.keys(legacy.avg3 || {}),
      ...Object.keys(legacy.bestVisit || {}),
      ...Object.keys(legacy.bestCheckout || {}),
      ...Object.keys(legacy.remaining || {}),
      ...Object.keys(legacy.singles || {}),
      ...Object.keys(legacy.doubles || {}),
      ...Object.keys(legacy.triples || {}),
      ...Object.keys(legacy.bulls || {}),
      ...Object.keys(legacy.dbulls || {}),
      ...Object.keys(legacy.misses || {}),
      ...Object.keys(legacy.busts || {}),
    ]);
    for (const id of ids) {
      const p = newPlayerAgg(id, names[id] || id);
      p.darts = num(legacy.darts?.[id] ?? legacy.totalDarts?.[id] ?? legacy.dartsThrown?.[id]);
      p.points = num(legacy.points?.[id] ?? legacy.totalScore?.[id] ?? legacy.scored?.[id] ?? legacy._sumPoints?.[id]);
      p.avg3 = num(legacy.avg3?.[id] ?? legacy.avg3ByPlayer?.[id], p.darts > 0 && p.points > 0 ? (p.points / p.darts) * 3 : 0);
      p.bestVisit = num(legacy.bestVisit?.[id] ?? legacy.bv?.[id]);
      p.bestCheckout = num(legacy.bestCheckout?.[id] ?? legacy.bestCo?.[id] ?? legacy.bestCO?.[id]);
      p.singles = num(legacy.singles?.[id] ?? legacy.hitsSingle?.[id]);
      p.doubles = num(legacy.doubles?.[id] ?? legacy.hitsDouble?.[id]);
      p.triples = num(legacy.triples?.[id] ?? legacy.hitsTriple?.[id]);
      p.bull25 = num(legacy.bulls?.[id] ?? legacy.bull?.[id] ?? legacy.bull25?.[id]);
      p.bull50 = num(legacy.dbulls?.[id] ?? legacy.dbull?.[id] ?? legacy.dBull?.[id] ?? legacy.bull50?.[id]);
      p.miss = num(legacy.misses?.[id] ?? legacy.miss?.[id]);
      p.bust = num(legacy.busts?.[id] ?? legacy.bust?.[id]);
      p.h50 = num(legacy.h50?.[id]);
      p.h60 = num(legacy.h60?.[id]);
      p.h80 = num(legacy.h80?.[id]);
      p.h100 = num(legacy.h100?.[id]);
      p.h120 = num(legacy.h120?.[id]);
      p.h140 = num(legacy.h140?.[id]);
      p.h180 = num(legacy.h180?.[id]);
      out.push(p);
    }
  };

  for (const obj of walkObjects(row, 7)) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) continue;
    consumeLegacy(obj?.legacy);
    if (obj?.remaining && obj?.darts && obj?.points) consumeLegacy(obj);
  }
  return out;
}

function normalizeVisit(visit: any, fallbackPid = ""): { pid: string; darts: any[]; dartsCount: number; score: number; bust: boolean; finish: boolean; before: number; after: number } | null {
  if (!visit || typeof visit !== "object") return null;
  const pid = str(visit.playerId ?? visit.pid ?? visit.profileId ?? visit.id ?? fallbackPid);
  const darts = Array.isArray(visit.darts) ? visit.darts : Array.isArray(visit.throws) ? visit.throws : Array.isArray(visit.segments) ? visit.segments : [];
  let dartsCount = num(visit.dartsCount ?? visit.dartCount ?? visit.dartsThrown ?? visit.totalDarts ?? visit.dt, 0);
  if (!dartsCount && darts.length) dartsCount = darts.length;
  if (!dartsCount && Array.isArray(visit.values)) dartsCount = visit.values.length;

  const before = num(visit.scoreBefore ?? visit.before ?? visit.remainingBefore ?? visit.startScore, NaN);
  const after = num(visit.scoreAfter ?? visit.after ?? visit.remainingAfter ?? visit.endScore, NaN);
  const bust = !!(visit.bust || visit.isBust);
  const finish = !!(visit.finish || visit.isFinish || visit.isCheckout || visit.checkout) || (!bust && Number.isFinite(after) && after === 0 && Number.isFinite(before) && before > 0);

  let score = num(visit.score ?? visit.visitScore ?? visit.points ?? visit.total ?? visit.rawScore, NaN);
  if (!Number.isFinite(score)) {
    if (Number.isFinite(before) && Number.isFinite(after)) score = Math.max(0, before - after);
    else if (darts.length) score = darts.reduce((a: number, d: any) => a + scoreOfDart(d), 0);
    else if (Array.isArray(visit.values)) score = visit.values.reduce((a: number, x: any) => a + num(x), 0);
    else score = 0;
  }
  if (bust && Number.isFinite(before) && Number.isFinite(after) && before === after) score = 0;

  if (!pid && !dartsCount && !score) return null;
  return { pid, darts, dartsCount, score: Math.max(0, score || 0), bust, finish, before, after };
}

function collectVisitAggRows(row: any, names: Record<string, string>): PlayerAgg[] {
  const map = new Map<string, PlayerAgg>();
  const seen = new Set<string>();
  const ensure = (pid: string) => {
    const key = str(pid || "unknown");
    if (!map.has(key)) map.set(key, newPlayerAgg(key, names[key] || key));
    return map.get(key)!;
  };

  const consume = (visit: any, fallbackPid = "", index = 0) => {
    const v = normalizeVisit(visit, fallbackPid);
    if (!v) return;
    const sig = `${v.pid}|${index}|${v.dartsCount}|${v.score}|${v.before}|${v.after}|${v.finish}|${v.bust}`;
    if (seen.has(sig)) return;
    seen.add(sig);
    const p = ensure(v.pid || fallbackPid || "unknown");
    if (v.darts.length) {
      v.darts.forEach((d) => consumeDart(p, d));
    } else {
      p.darts += v.dartsCount;
    }
    p.points += v.bust ? 0 : v.score;
    p.bestVisit = Math.max(p.bestVisit, v.score);
    if (v.finish) p.bestCheckout = Math.max(p.bestCheckout, v.score || (Number.isFinite(v.before) ? v.before : 0));
    if (v.bust) p.bust += 1;
    const buckets = bucketCountsFromVisits([v.score]);
    addToAgg(p, buckets as any);
  };

  for (const obj of walkObjects(row, 8)) {
    if (!obj || typeof obj !== "object") continue;
    if (Array.isArray(obj)) continue;

    for (const key of ["visitHistory", "visitsHistory", "turns", "rounds", "visits"]) {
      const list = obj?.[key];
      if (Array.isArray(list)) list.forEach((v, i) => consume(v, "", i));
      else if (isPlainObject(list)) Object.entries(list).forEach(([pid, arr]) => {
        if (Array.isArray(arr)) arr.forEach((v, i) => consume(v, pid, i));
      });
    }
  }

  // Flat replay darts fallback, group by player + visit index when possible.
  const flatDarts: any[] = [];
  for (const obj of walkObjects(row, 6)) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) continue;
    for (const key of ["replayDarts", "dartsDetail", "dartsdetail", "__x01OnlineDarts"]) {
      const arr = obj?.[key];
      if (Array.isArray(arr) && arr.some((d) => d && typeof d === "object" && (d.playerId || d.pid || d.profileId))) {
        flatDarts.push(...arr);
      }
    }
  }
  if (flatDarts.length && Array.from(map.values()).reduce((a, p) => a + p.darts, 0) <= 0) {
    const visitScores: Record<string, Record<string, number>> = {};
    flatDarts.forEach((d, i) => {
      const pid = str(d.playerId ?? d.pid ?? d.profileId ?? d.id ?? "unknown");
      const p = ensure(pid);
      consumeDart(p, d);
      p.points += d?.isBust || d?.bust ? 0 : scoreOfDart(d);
      const visitNo = str(d.visitNo ?? d.visitIndex ?? d.turnNo ?? d.turnIndex ?? Math.floor(i / 3));
      visitScores[pid] ||= {};
      visitScores[pid][visitNo] = (visitScores[pid][visitNo] || 0) + scoreOfDart(d);
    });
    for (const [pid, scores] of Object.entries(visitScores)) {
      const p = ensure(pid);
      const vals = Object.values(scores).map(Number).filter(Number.isFinite);
      p.bestVisit = Math.max(p.bestVisit, vals.length ? Math.max(...vals) : 0);
      addToAgg(p, bucketCountsFromVisits(vals) as any);
    }
  }

  for (const p of map.values()) {
    p.avg3 = p.darts > 0 ? (p.points / p.darts) * 3 : p.avg3;
  }
  return Array.from(map.values()).filter((p) => p.darts || p.points || p.bestVisit || p.bestCheckout || p.singles || p.doubles || p.triples || p.bull25 || p.bull50 || p.miss);
}

function collectAggregateStats(row: any): PlayerAgg | null {
  const candidates = [row?.stats, row?.payload?.stats, row?.summary?.stats, row?.payload?.summary?.stats].filter(isPlainObject);
  for (const c of candidates) {
    const p = statsFromObject(c, "global", "Total");
    const br = c?.breakdown || c?.hits || {};
    p.singles = p.singles || num(br.s ?? br.S ?? br.singles ?? br.hitsS);
    p.doubles = p.doubles || num(br.d ?? br.D ?? br.doubles ?? br.hitsD);
    p.triples = p.triples || num(br.t ?? br.T ?? br.triples ?? br.hitsT);
    p.bull25 = p.bull25 || num(br.bull ?? br.bulls ?? br.bull25);
    p.bull50 = p.bull50 || num(br.dbull ?? br.dBull ?? br.dbulls ?? br.bull50);
    p.miss = p.miss || num(br.miss ?? br.misses);
    p.bust = p.bust || num(br.bust ?? br.busts);
    p.points = p.points || num(c.totalScore ?? c.points ?? c._sumPoints);
    p.darts = p.darts || num(c.darts ?? c.totalDarts ?? c._sumDarts);
    p.bestVisit = p.bestVisit || num(c.bestVisit ?? c.bv);
    p.bestCheckout = p.bestCheckout || num(c.bestCheckout ?? c.bestCo ?? c.co);
    p.avg3 = p.avg3 || (p.darts > 0 && p.points > 0 ? (p.points / p.darts) * 3 : 0);
    if (p.darts || p.points || p.bestVisit || p.singles || p.miss) return p;
  }
  return null;
}

function mergePlayerAggs(rows: PlayerAgg[], names: Record<string, string>): PlayerAgg[] {
  const byId = new Map<string, PlayerAgg>();
  for (const row of rows || []) {
    const id = str(row.id || row.name || `player-${byId.size}`);
    const key = id || `player-${byId.size}`;
    if (!byId.has(key)) byId.set(key, newPlayerAgg(key, row.name || names[key] || key));
    const target = byId.get(key)!;
    if (!target.name || target.name === target.id) target.name = row.name || names[key] || target.name;

    // Important : plusieurs sources décrivent souvent le même joueur.
    // Pour éviter de doubler les stats, on garde la source la plus riche par champ,
    // sauf pour les lignes legacy/visites déjà agrégées entre elles avant passage ici.
    for (const k of ["darts", "points", "singles", "doubles", "triples", "bull25", "bull50", "miss", "bust", "h50", "h60", "h80", "h100", "h120", "h140", "h180"] as const) {
      const n = Number((row as any)[k]);
      if (Number.isFinite(n) && n > (target as any)[k]) (target as any)[k] = n;
    }
    for (const k of ["avg3", "bestVisit", "bestCheckout"] as const) {
      const n = Number((row as any)[k]);
      if (Number.isFinite(n) && n > (target as any)[k]) (target as any)[k] = n;
    }
  }

  for (const p of byId.values()) {
    if (!p.avg3 && p.darts > 0 && p.points > 0) p.avg3 = (p.points / p.darts) * 3;
  }

  return Array.from(byId.values()).filter((p) => p.darts || p.points || p.bestVisit || p.bestCheckout || p.singles || p.doubles || p.triples || p.bull25 || p.bull50 || p.miss);
}

function extractStats(row: any): ExtractedStats {
  const names = collectNameMap(row);
  const statRows: PlayerAgg[] = [];

  for (const { key, value } of collectPlayerStatsObjects(row)) {
    const p = statsFromObject(value, key, names[key] || key);
    if (!p.name && p.id && names[p.id]) p.name = names[p.id];
    statRows.push(p);
  }

  statRows.push(...collectLegacyPlayerRows(row, names));
  statRows.push(...collectVisitAggRows(row, names));

  const aggregate = collectAggregateStats(row);
  const players = mergePlayerAggs(statRows, names);

  let darts = players.reduce((a, p) => a + num(p.darts), 0);
  let points = players.reduce((a, p) => a + num(p.points), 0);
  let bestVisit = Math.max(0, ...players.map((p) => num(p.bestVisit)));
  let bestCheckout = Math.max(0, ...players.map((p) => num(p.bestCheckout)));
  let singles = players.reduce((a, p) => a + num(p.singles), 0);
  let doubles = players.reduce((a, p) => a + num(p.doubles), 0);
  let triples = players.reduce((a, p) => a + num(p.triples), 0);
  let bull25 = players.reduce((a, p) => a + num(p.bull25), 0);
  let bull50 = players.reduce((a, p) => a + num(p.bull50), 0);
  let miss = players.reduce((a, p) => a + num(p.miss), 0);

  if (aggregate) {
    darts = Math.max(darts, aggregate.darts);
    points = Math.max(points, aggregate.points);
    bestVisit = Math.max(bestVisit, aggregate.bestVisit);
    bestCheckout = Math.max(bestCheckout, aggregate.bestCheckout);
    singles = Math.max(singles, aggregate.singles);
    doubles = Math.max(doubles, aggregate.doubles);
    triples = Math.max(triples, aggregate.triples);
    bull25 = Math.max(bull25, aggregate.bull25);
    bull50 = Math.max(bull50, aggregate.bull50);
    miss = Math.max(miss, aggregate.miss);
  }

  const hits = singles + doubles + triples + bull25 + bull50;
  const avg3 = darts > 0 && points > 0
    ? round1((points / darts) * 3)
    : round1(Math.max(0, ...players.map((p) => num(p.avg3)), aggregate?.avg3 || 0));
  const hitPct = darts > 0 ? round1((hits / darts) * 100) : hits + miss > 0 ? round1((hits / (hits + miss)) * 100) : 0;
  const startScore = num(deepFirst(row, ["startScore", "startscore", "x01StartScore", "targetScore", "x01"]), 0);

  const scoreLabel = buildScoreLabel(row, players, names, startScore);
  const detailLabel = buildDetailLabel(row, { darts, points, hits, miss, startScore, statsSource: sourceLabel(row, players, aggregate) });
  const quality = darts + points + bestVisit + bestCheckout + avg3 + hits + miss;

  return {
    players,
    darts,
    points,
    avg3,
    bestVisit,
    bestCheckout,
    hits,
    miss,
    hitPct,
    startScore,
    scoreLabel,
    detailLabel,
    quality,
    statsSource: sourceLabel(row, players, aggregate),
  };
}

function sourceLabel(row: any, players: PlayerAgg[], aggregate: PlayerAgg | null): string {
  if (players.some((p) => p.darts || p.points)) {
    if (walkObjects(row, 4).some((o) => o?.legacy && typeof o.legacy === "object")) return "History legacy";
    if (walkObjects(row, 4).some((o) => Array.isArray(o?.visitHistory) || Array.isArray(o?.visitsHistory))) return "Volées";
    return "History stats";
  }
  if (aggregate) return "Stats agrégées";
  return "Miroir incomplet";
}

function valueMapLabel(title: string, map: any, names: Record<string, string>, max = 4): string {
  const entries = mapEntries(map).filter(([, v]) => v !== undefined && v !== null && String(v) !== "");
  if (!entries.length) return "";
  return `${title}: ${entries.slice(0, max).map(([id, v]) => `${playerShortName(names[id] || id)} ${Math.round(num(v) * 10) / 10}`).join(" · ")}${entries.length > max ? "…" : ""}`;
}

function buildScoreLabel(row: any, players: PlayerAgg[], names: Record<string, string>, startScore: number): string {
  const explicit = str(deepFirst(row, ["scoreLine", "line", "finalScoreLabel", "scoreLabel"]));
  if (explicit && !explicit.toLowerCase().includes("non disponible")) return explicit;

  const finalScores = deepFirst(row, ["finalScores", "remaining", "remainingByPlayer", "scoreRemainingByPlayer"]);
  const remainingLabel = valueMapLabel("Restes", finalScores, names, 4);
  if (remainingLabel) return remainingLabel;

  const matchScore = deepFirst(row, ["matchScore", "setsScore", "legsScore", "setsWon", "legsWon"]);
  const matchLabel = valueMapLabel("Match", matchScore, names, 4);
  if (matchLabel) return matchLabel;

  const usefulPlayers = players.filter((p) => p.darts || p.points || p.avg3 || p.bestVisit || p.bestCheckout);
  if (usefulPlayers.length) {
    return usefulPlayers.slice(0, 5).map((p) => {
      const name = playerShortName(p.name || names[p.id] || p.id || "Joueur");
      const bits: string[] = [];
      if (startScore > 0 && p.points > 0) bits.push(`reste ${Math.max(0, Math.round(startScore - p.points))}`);
      else if (p.points > 0) bits.push(`${Math.round(p.points)} pts`);
      if (p.darts > 0) bits.push(`${Math.round(p.darts)}D`);
      if (p.avg3 > 0) bits.push(`M3 ${round1(p.avg3)}`);
      if (p.bestVisit > 0) bits.push(`BV ${Math.round(p.bestVisit)}`);
      if (p.bestCheckout > 0) bits.push(`CO ${Math.round(p.bestCheckout)}`);
      return `${name}: ${bits.join(" · ")}`;
    }).join(" · ");
  }

  return "Score non disponible";
}

function buildDetailLabel(row: any, info: { darts: number; points: number; hits: number; miss: number; startScore: number; statsSource: string }) {
  const parts: string[] = [];
  const winner = str(deepFirst(row, ["winnerName", "winner", "winnerLabel"]));
  const winnerId = str(deepFirst(row, ["winnerId", "winner_id"]));
  if (winner) parts.push(`Gagnant: ${winner}`);
  else if (winnerId) parts.push(`Gagnant ID: ${winnerId}`);
  if (info.startScore > 0) parts.push(`X01 ${Math.round(info.startScore)}`);
  if (info.darts > 0) parts.push(`${Math.round(info.darts)} darts`);
  if (info.points > 0) parts.push(`${Math.round(info.points)} pts`);
  if (info.hits || info.miss) parts.push(`${Math.round(info.hits)} hits / ${Math.round(info.miss)} miss`);
  if (info.statsSource) parts.push(info.statsSource);
  return parts.join(" · ");
}

function hashLite(input: any): string {
  const text = String(input ?? "");
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function pushSessionKey(keys: any[], value: any, allowColonBase = true) {
  const s = str(value);
  if (!s) return;
  keys.push(s);
  if (allowColonBase && s.includes(":")) {
    const base = s.split(":")[0]?.trim();
    if (base && base.length >= 6) keys.push(base);
  }
}

function isGenericMatchId(value: any): boolean {
  const id = str(value);
  if (!id) return false;
  // Évite les ids de joueurs/profils/bots/teams qui étaient la cause des fusions.
  if (/^(usr|user|profile|player|bot|team|avatar|friend|req)[_:-]/i.test(id)) return false;
  // Un id numérique court ou un nom de joueur n'identifie pas une session.
  if (/^\d{1,5}$/.test(id)) return false;
  return id.length >= 6;
}

function collectRootSessionKeys(obj: any, keys: any[], includeGenericId = false) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
  pushSessionKey(keys, obj.matchId);
  pushSessionKey(keys, obj.match_id);
  pushSessionKey(keys, obj.resumeId);
  pushSessionKey(keys, obj.resume_id);
  pushSessionKey(keys, obj.sessionId);
  pushSessionKey(keys, obj.session_id);
  pushSessionKey(keys, obj.onlineMatchId);
  pushSessionKey(keys, obj.online_match_id);
  pushSessionKey(keys, obj.lobbyMatchId);
  pushSessionKey(keys, obj.lobby_match_id);
  pushSessionKey(keys, obj.historyId);
  pushSessionKey(keys, obj.history_id);
  if (includeGenericId && isGenericMatchId(obj.id)) pushSessionKey(keys, obj.id);
}

function directTs(...values: any[]): number {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "string") {
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function buildFallbackSessionKey(row: any): string {
  if (!row || typeof row !== "object") return "";
  const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
  const summary = row.summary && typeof row.summary === "object" ? row.summary : payload.summary && typeof payload.summary === "object" ? payload.summary : {};
  const created = directTs(
    row.createdAt, row.created_at, row.date, row.ts, row.startedAt, row.finishedAt,
    payload.createdAt, payload.created_at, payload.startedAt, payload.finishedAt,
    summary.createdAt, summary.finishedAt, summary.updatedAt,
  );
  const mode = str(row.mode || row.kind || payload.mode || payload.onlineMode || summary.mode || "online");
  const players = collectPlayersLabel(row) || "players";
  const score = str(row.scoreLabel || row.finalScoreLabel || summary.scoreLabel || summary.finalScoreLabel || summary.winnerName || row.winnerName || "");
  const statSig = `${num(row?.stats?.darts ?? row?.darts)}:${num(row?.stats?.totalScore ?? row?.totalScore)}:${num(row?.stats?.bestVisit ?? row?.bestVisit)}`;
  const storageKey = str(row.__localStorageKey || row.__historySource || row.__storeSource || "src");
  const storageIndex = str(row.__cleanupIndex ?? "");

  if (!created && !score && !storageIndex) return "";
  return `online-session:${storageKey}:${storageIndex}:${created || "no-date"}:${normKey(mode)}:${hashLite(`${players}|${score}|${statSig}`)}`;
}

export function getOnlineStatsSessionKeys(row: any): string[] {
  const keys: any[] = [];

  // Seulement des objets racines connus : jamais de scan profond des ids.
  collectRootSessionKeys(row, keys, true);
  collectRootSessionKeys(row?.payload, keys, true);
  collectRootSessionKeys(row?.summary, keys, true);
  collectRootSessionKeys(row?.payload?.summary, keys, true);
  collectRootSessionKeys(row?.match, keys, true);
  collectRootSessionKeys(row?.payload?.match, keys, true);
  collectRootSessionKeys(row?.state?.match, keys, true);
  collectRootSessionKeys(row?.payload?.state?.match, keys, true);

  // Important : pas de roomId/lobbyCode ici. Un salon peut contenir plusieurs matchs.
  const fallback = buildFallbackSessionKey(row);
  if (fallback) pushSessionKey(keys, fallback, false);

  return uniq(keys);
}

export function readOnlineStatsExcludedMap(): ExclusionMap {
  if (!isBrowser()) return {};
  const merged: ExclusionMap = {};
  for (const key of storageKeys()) {
    const parsed = readJson<any>(key, {});
    if (Array.isArray(parsed)) {
      parsed.forEach((id) => {
        const k = str(id);
        if (k) merged[k] = { excludedAt: 1, reason: "legacy-array" };
      });
    } else if (parsed && typeof parsed === "object") {
      for (const [id, entry] of Object.entries(parsed)) {
        const k = str(id);
        if (!k) continue;
        merged[k] = typeof entry === "object" && entry
          ? { excludedAt: num((entry as any).excludedAt, 1), restoredAt: (entry as any).restoredAt, reason: (entry as any).reason }
          : { excludedAt: 1, reason: "legacy-map" };
      }
    }
  }
  return merged;
}

function saveOnlineStatsExcludedMap(map: ExclusionMap) {
  if (!isBrowser()) return;
  writeJson(scopedStorageKey(ONLINE_STATS_EXCLUDED_KEY), map || {});
}

function hasFlagInRecord(row: any): boolean {
  const flagKeys = new Set([
    "excludedFromStats",
    "excluded_from_stats",
    "statsExcluded",
    "stats_excluded",
    "excludeFromStats",
    "exclude_from_stats",
    "excludedOnlineStats",
    "excluded_online_stats",
  ].map(normKey));
  const deletedKeys = new Set(["deletedAt", "deleted_at", "statsDeletedAt", "stats_deleted_at"].map(normKey));

  for (const obj of walkObjects(row, 5)) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) continue;
    for (const [key, value] of Object.entries(obj)) {
      const lk = normKey(key);
      if (flagKeys.has(lk) && asBool(value)) return true;
      if (deletedKeys.has(lk) && value !== null && value !== undefined && String(value).trim() !== "") return true;
      if (lk === "statstag" || lk === "tag") {
        const s = String(value ?? "").toLowerCase();
        if (s === "test" || s === "debug" || s === "excluded") return true;
      }
    }
  }
  return false;
}

export function isOnlineStatsExcluded(row: any): boolean {
  if (!row) return false;
  if (hasFlagInRecord(row)) return true;
  const excluded = readOnlineStatsExcludedMap();
  const keys = getOnlineStatsSessionKeys(row);
  return keys.some((k) => !!excluded[k]);
}

export function filterOnlineStatsEligible<T>(rows: T[]): T[] {
  return (rows || []).filter((row: any) => !isOnlineStatsExcluded(row));
}

function deepTextBag(row: any): string {
  const vals: string[] = [];
  for (const obj of walkObjects(row, 4)) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) continue;
    for (const [key, value] of Object.entries(obj)) {
      const lk = String(key).toLowerCase();
      if (/mode|kind|source|online|lobby|room|sport|variant|type|game/.test(lk)) {
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") vals.push(String(value));
      }
    }
  }
  return vals.map((v) => v.trim().toLowerCase()).filter(Boolean).join("|");
}

function isLikelyOnlineRecord(row: any): boolean {
  for (const obj of walkObjects(row, 5)) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) continue;
    if (obj.online === true || obj.isOnline === true || obj.onlineMatch === true || obj.onlineV10 === true) return true;
    const code = obj.lobbyCode ?? obj.onlineLobbyCode ?? obj.lobbyId ?? obj.roomCode ?? obj.roomId ?? obj.onlineRoomId;
    if (code && String(code).trim().length >= 3) return true;
  }
  const bag = deepTextBag(row);
  return /online|nas-online|x01_online|online_lobby|online-match|onlinematch/.test(bag);
}

function collectPlayersLabel(row: any, stats?: ExtractedStats): string {
  const names: string[] = [];
  const pushName = (p: any) => {
    const n = playerNameOf(p);
    if (n) names.push(n);
  };
  for (const obj of walkObjects(row, 5)) {
    if (!obj || typeof obj !== "object") continue;
    if (Array.isArray(obj?.players)) obj.players.forEach(pushName);
    if (Array.isArray(obj?.rankings)) obj.rankings.forEach(pushName);
    if (Array.isArray(obj?.perPlayer)) obj.perPlayer.forEach(pushName);
  }
  if (stats?.players?.length) stats.players.forEach((p) => p.name && names.push(p.name));
  return uniq(names).slice(0, 6).join(" · ") || "Joueurs inconnus";
}

function getModeLabel(row: any): string {
  const mode = deepFirst(row, ["onlineMode", "gameMode", "mode", "kind", "variant", "sport", "game"]);
  const s = str(mode || "online").replace(/_/g, " ");
  if (/x01/i.test(s) && isLikelyOnlineRecord(row)) return "X01 Online";
  return s || "online";
}

function getDeletedAt(row: any): number | null {
  const v = deepFirst(row, ["deletedAt", "deleted_at", "statsDeletedAt", "stats_deleted_at"]);
  if (v === undefined || v === null || v === "") return null;
  const n = num(v, 0);
  return n || nowTs();
}

function getCreatedAt(row: any): number {
  const raw = deepFirst(row, ["createdAt", "created_at", "date", "ts", "startedAt", "started_at", "finishedAt", "finished_at"]);
  if (typeof raw === "string") {
    const t = Date.parse(raw);
    if (Number.isFinite(t)) return t;
  }
  return num(raw, Date.now());
}

function getUpdatedAt(row: any): number {
  const raw = deepFirst(row, ["updatedAt", "updated_at", "finishedAt", "finished_at", "createdAt", "created_at", "date", "ts"]);
  if (typeof raw === "string") {
    const t = Date.parse(raw);
    if (Number.isFinite(t)) return t;
  }
  return num(raw, getCreatedAt(row));
}

function mergeHistoryFull(light: any, full: any): any {
  const out: any = {
    ...(light || {}),
    ...(full || {}),
  };
  const payload = {
    ...((light || {}).payload && typeof (light || {}).payload === "object" ? (light || {}).payload : {}),
    ...((full || {}).payload && typeof (full || {}).payload === "object" ? (full || {}).payload : {}),
  };
  const summary = {
    ...((light || {}).summary && typeof (light || {}).summary === "object" ? (light || {}).summary : {}),
    ...((full || {}).summary && typeof (full || {}).summary === "object" ? (full || {}).summary : {}),
    ...(payload?.summary && typeof payload.summary === "object" ? payload.summary : {}),
  };
  if (Object.keys(payload).length) out.payload = payload;
  if (Object.keys(summary).length) out.summary = summary;
  return out;
}

function normalizeCleanupSession(row: any, source: "history" | "store" | "localStorage", idx = 0): OnlineStatsCleanupSession | null {
  if (!row || typeof row !== "object") return null;
  if (!isLikelyOnlineRecord(row)) return null;

  const stats = extractStats(row);
  const keys = getOnlineStatsSessionKeys(row);
  const id = keys[0] || `online-cleanup-${source}-${idx}`;
  const matchId = str(row?.matchId ?? row?.payload?.matchId ?? row?.summary?.matchId ?? row?.id ?? id) || id;

  return {
    id,
    matchId,
    keys: uniq([id, matchId, ...keys]),
    source,
    mode: getModeLabel(row),
    createdAt: getCreatedAt(row),
    updatedAt: getUpdatedAt(row),
    playersLabel: collectPlayersLabel(row, stats),
    winnerLabel: str(deepFirst(row, ["winnerName", "winner", "winnerLabel"]) || deepFirst(row, ["winnerId"])),
    scoreLabel: stats.scoreLabel,
    detailLabel: stats.detailLabel,
    darts: Math.round(stats.darts || 0),
    avg3: round1(stats.avg3 || 0),
    bestVisit: Math.round(stats.bestVisit || 0),
    bestCheckout: Math.round(stats.bestCheckout || 0),
    hitPct: round1(stats.hitPct || 0),
    excludedFromStats: isOnlineStatsExcluded(row),
    deletedAt: getDeletedAt(row),
    raw: row,
  };
}

async function loadHistoryOnlineRows(): Promise<OnlineStatsCleanupSession[]> {
  try {
    const light = await History.listFinished();
    const out: OnlineStatsCleanupSession[] = [];
    for (let i = 0; i < (Array.isArray(light) ? light.length : 0); i += 1) {
      const row = light[i];
      let full = row;
      try {
        const id = str(row?.id ?? row?.matchId);
        if (id) full = mergeHistoryFull(row, (await History.get(id)) || {});
      } catch {}
      const normalized = normalizeCleanupSession({ ...(full || {}), __historySource: "history", __cleanupIndex: i }, "history", i);
      if (normalized) out.push(normalized);
    }
    return out;
  } catch {
    return [];
  }
}

async function loadStoreOnlineRows(): Promise<OnlineStatsCleanupSession[]> {
  try {
    const store: any = (await loadStore?.()) || {};
    const buckets: any[] = [];
    const pushArray = (arr: any) => {
      if (Array.isArray(arr)) buckets.push(...arr);
    };

    pushArray(store.history);
    pushArray(store.saved);
    pushArray(store.matches);
    pushArray(store.onlineMatches);
    pushArray(store.historyRows);
    pushArray(store.historyCache);
    pushArray(store.savedMatches);
    pushArray(store.matchHistory);

    const out: OnlineStatsCleanupSession[] = [];
    buckets.forEach((row, idx) => {
      const normalized = normalizeCleanupSession({ ...(row || {}), __storeSource: "store", __cleanupIndex: idx }, "store", idx);
      if (normalized) out.push(normalized);
    });
    return out;
  } catch {
    return [];
  }
}

function localStorageOnlineArrays(): Array<{ key: string; rows: any[] }> {
  if (!isBrowser()) return [];
  const out: Array<{ key: string; rows: any[] }> = [];
  const seen = new Set<string>();

  for (const key of onlineMatchStorageKeys()) {
    if (seen.has(key)) continue;
    seen.add(key);
    const rows = readJson<any[]>(key, []);
    if (Array.isArray(rows)) out.push({ key, rows });
  }

  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i) || "";
      if (seen.has(key)) continue;
      if (!/online.*match|match.*online|history/i.test(key)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw || raw.length > 5_000_000) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.some(isLikelyOnlineRecord)) {
        seen.add(key);
        out.push({ key, rows: parsed });
      }
    }
  } catch {}

  return out;
}

function loadLocalStorageOnlineRows(): OnlineStatsCleanupSession[] {
  if (!isBrowser()) return [];
  const out: OnlineStatsCleanupSession[] = [];
  for (const bucket of localStorageOnlineArrays()) {
    bucket.rows.forEach((row, idx) => {
      const normalized = normalizeCleanupSession({ ...(row || {}), source: row?.source || "online", __localStorageKey: bucket.key, __cleanupIndex: idx }, "localStorage", idx);
      if (normalized) out.push(normalized);
    });
  }
  return out;
}

function isInformativeScore(label: any): boolean {
  const s = str(label).toLowerCase();
  return !!s && !s.includes("score non disponible") && !s.includes("non disponible");
}

function preferLabel(a: any, b: any, unavailableFallback = ""): string {
  const aa = str(a);
  const bb = str(b);
  const ai = isInformativeScore(aa);
  const bi = isInformativeScore(bb);
  if (bi && !ai) return bb;
  if (ai && !bi) return aa;
  if (bi && ai) return bb.length > aa.length ? bb : aa;
  return aa || bb || unavailableFallback;
}

function sessionStatsPower(s: OnlineStatsCleanupSession): number {
  return num(s?.darts) * 4 + num(s?.bestVisit) + num(s?.bestCheckout) + num(s?.avg3) + num(s?.hitPct);
}

function mergeCleanupSessions(a: OnlineStatsCleanupSession, b: OnlineStatsCleanupSession): OnlineStatsCleanupSession {
  const bHasMoreStats = sessionStatsPower(b) > sessionStatsPower(a);
  const richer = bHasMoreStats ? b : a;
  const base = bHasMoreStats ? a : b;
  return {
    ...base,
    ...richer,
    id: a.id || b.id,
    matchId: a.matchId || b.matchId || a.id || b.id,
    keys: uniq([...(a.keys || []), ...(b.keys || []), a.id, a.matchId, b.id, b.matchId]),
    source: bHasMoreStats ? b.source : a.source,
    createdAt: Math.min(num(a.createdAt, Date.now()), num(b.createdAt, Date.now())),
    updatedAt: Math.max(num(a.updatedAt, 0), num(b.updatedAt, 0)),
    playersLabel: str(b.playersLabel) && b.playersLabel !== "Joueurs inconnus" && String(b.playersLabel).length >= String(a.playersLabel || "").length ? b.playersLabel : a.playersLabel,
    winnerLabel: str(b.winnerLabel) || str(a.winnerLabel),
    scoreLabel: preferLabel(a.scoreLabel, b.scoreLabel, "Score non disponible"),
    detailLabel: preferLabel(a.detailLabel, b.detailLabel, ""),
    darts: Math.max(num(a.darts), num(b.darts)),
    avg3: num(b.avg3) > 0 ? num(b.avg3) : num(a.avg3),
    bestVisit: Math.max(num(a.bestVisit), num(b.bestVisit)),
    bestCheckout: Math.max(num(a.bestCheckout), num(b.bestCheckout)),
    hitPct: num(b.hitPct) > 0 ? num(b.hitPct) : num(a.hitPct),
    excludedFromStats: a.excludedFromStats || b.excludedFromStats,
    deletedAt: a.deletedAt || b.deletedAt,
    raw: bHasMoreStats ? b.raw : a.raw,
  };
}

export async function listOnlineStatsCleanupSessions(): Promise<OnlineStatsCleanupSession[]> {
  const byPrimary = new Map<string, OnlineStatsCleanupSession>();
  const aliasToPrimary = new Map<string, string>();

  const push = (session: OnlineStatsCleanupSession | null) => {
    if (!session) return;
    const aliases = uniq([session.id, session.matchId, ...(session.keys || [])]);
    let primary = aliases.map((a) => aliasToPrimary.get(a)).find(Boolean) || "";
    if (!primary) {
      for (const [p, existing] of byPrimary.entries()) {
        const existingAliases = new Set([existing.id, existing.matchId, ...(existing.keys || [])].map(str).filter(Boolean));
        if (aliases.some((a) => existingAliases.has(a))) {
          primary = p;
          break;
        }
      }
    }
    if (!primary) primary = aliases[0] || session.id;

    const existing = byPrimary.get(primary);
    const next = existing ? mergeCleanupSessions(existing, { ...session, keys: aliases }) : { ...session, keys: aliases };
    byPrimary.set(primary, next);
    for (const alias of next.keys || []) aliasToPrimary.set(alias, primary);
  };

  (await loadHistoryOnlineRows()).forEach(push);
  (await loadStoreOnlineRows()).forEach(push);
  loadLocalStorageOnlineRows().forEach(push);

  return Array.from(byPrimary.values()).sort((a, b) => b.createdAt - a.createdAt);
}

function mergeExcludedSummary(summary: any, excluded: boolean, reason?: string) {
  const ts = nowTs();
  const base = summary && typeof summary === "object" ? { ...summary } : {};
  const statsMeta = base.statsMeta && typeof base.statsMeta === "object" ? { ...base.statsMeta } : {};
  return {
    ...base,
    excludedFromStats: excluded,
    excluded_from_stats: excluded,
    statsTag: excluded ? "test" : "official",
    stats_tag: excluded ? "test" : "official",
    statsMeta: {
      ...statsMeta,
      excludedFromStats: excluded,
      excluded_from_stats: excluded,
      statsExcludedAt: excluded ? ts : null,
      statsRestoredAt: excluded ? null : ts,
      reason: excluded ? reason || "online-cleanup" : "restored",
    },
  };
}

function mergeExcludedPayload(payload: any, excluded: boolean, reason?: string) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const out: any = { ...payload };
  out.excludedFromStats = excluded;
  out.excluded_from_stats = excluded;
  out.statsTag = excluded ? "test" : "official";
  out.stats_tag = excluded ? "test" : "official";
  out.summary = mergeExcludedSummary(out.summary, excluded, reason);
  return out;
}

function applyToLocalStorageMatches(keys: string[], excluded: boolean, reason?: string) {
  if (!isBrowser()) return;
  const keySet = new Set((keys || []).map(str).filter(Boolean));
  for (const bucket of localStorageOnlineArrays()) {
    const arr = bucket.rows;
    if (!Array.isArray(arr) || !arr.length) continue;
    let changed = false;
    const next = arr.map((row) => {
      const rowKeys = getOnlineStatsSessionKeys(row);
      const match = rowKeys.some((k) => keySet.has(k));
      if (!match) return row;
      changed = true;
      return {
        ...(row || {}),
        excludedFromStats: excluded,
        excluded_from_stats: excluded,
        statsTag: excluded ? "test" : "official",
        stats_tag: excluded ? "test" : "official",
        summary: mergeExcludedSummary(row?.summary, excluded, reason),
        payload: mergeExcludedPayload(row?.payload, excluded, reason),
      };
    });
    if (changed) writeJson(bucket.key, next);
  }
}

export async function setOnlineStatsSessionsExcluded(idsOrKeys: string[], excluded: boolean, reason = "online-cleanup") {
  const keys = uniq(idsOrKeys || []);
  if (!keys.length) return;

  const map = readOnlineStatsExcludedMap();
  const ts = nowTs();
  for (const key of keys) {
    if (excluded) map[key] = { excludedAt: ts, reason };
    else delete map[key];
  }
  saveOnlineStatsExcludedMap(map);

  const sessions = await listOnlineStatsCleanupSessions().catch(() => []);
  const selected = sessions.filter((s) => s.keys.some((k) => keys.includes(k)) || keys.includes(s.id) || keys.includes(s.matchId));

  for (const session of selected) {
    applyToLocalStorageMatches(session.keys, excluded, reason);

    const id = str(session.matchId || session.id);
    if (!id) continue;
    try {
      const full = (await History.get(id)) || session.raw;
      if (!full) continue;
      const next = {
        ...full,
        excludedFromStats: excluded,
        excluded_from_stats: excluded,
        statsTag: excluded ? "test" : "official",
        stats_tag: excluded ? "test" : "official",
        summary: mergeExcludedSummary(full?.summary, excluded, reason),
        payload: mergeExcludedPayload(full?.payload, excluded, reason),
      };
      await History.upsert(next as any);
    } catch {
      // Le fallback localStorage suffit pour filtrer les stats immédiatement.
    }
  }

  try { window.dispatchEvent(new Event("dc-online-stats-exclusions-changed")); } catch {}
  try { window.dispatchEvent(new Event("dc-history-updated")); } catch {}
}

export async function keepOnlyOnlineStatsSessions(idsOrKeysToKeep: string[], reason = "online-cleanup-keep-only") {
  const keep = new Set(uniq(idsOrKeysToKeep || []));
  if (!keep.size) return;
  const sessions = await listOnlineStatsCleanupSessions();
  const toExclude: string[] = [];
  for (const session of sessions) {
    const mustKeep = session.keys.some((k) => keep.has(k)) || keep.has(session.id) || keep.has(session.matchId);
    if (!mustKeep) toExclude.push(...session.keys);
  }
  await setOnlineStatsSessionsExcluded(toExclude, true, reason);
  await setOnlineStatsSessionsExcluded(Array.from(keep), false, "online-cleanup-kept-session");
}

export async function hardDeleteOnlineStatsSessions(idsOrKeys: string[]) {
  const keys = uniq(idsOrKeys || []);
  if (!keys.length) return;
  const keySet = new Set(keys);
  const sessions = await listOnlineStatsCleanupSessions();
  const selected = sessions.filter((s) => s.keys.some((k) => keySet.has(k)) || keySet.has(s.id) || keySet.has(s.matchId));

  for (const session of selected) {
    try { await History.remove(session.matchId || session.id); } catch {}

    if (isBrowser()) {
      for (const bucket of localStorageOnlineArrays()) {
        const arr = bucket.rows;
        if (!Array.isArray(arr) || !arr.length) continue;
        const next = arr.filter((row) => !getOnlineStatsSessionKeys(row).some((k) => session.keys.includes(k)));
        if (next.length !== arr.length) writeJson(bucket.key, next);
      }
    }
  }

  const map = readOnlineStatsExcludedMap();
  for (const session of selected) {
    for (const key of session.keys) delete map[key];
  }
  saveOnlineStatsExcludedMap(map);

  try { window.dispatchEvent(new Event("dc-online-stats-exclusions-changed")); } catch {}
  try { window.dispatchEvent(new Event("dc-history-updated")); } catch {}
}

export function clearOnlineStatsExclusionLocalIndex() {
  saveOnlineStatsExcludedMap({});
  try { window.dispatchEvent(new Event("dc-online-stats-exclusions-changed")); } catch {}
  try { window.dispatchEvent(new Event("dc-history-updated")); } catch {}
}
