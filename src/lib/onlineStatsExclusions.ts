// @ts-nocheck
// =============================================================
// src/lib/onlineStatsExclusions.ts
// Nettoyage statistiques ONLINE — exclusion/restauration sans supprimer
// brutalement les matchs sources.
//
// Objectif : permettre de masquer des parties de test dans Stats Online,
// X01Compare et Classements Online, tout en gardant une restauration possible.
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

function walkObjects(root: any, maxDepth = 6): any[] {
  const out: any[] = [];
  const seen = new WeakSet<object>();
  const skip = /avatar|dataurl|image|photo|thumb|blob|base64|file|bytes/i;
  const walk = (x: any, depth: number) => {
    if (!x || typeof x !== "object" || depth > maxDepth) return;
    if (seen.has(x)) return;
    if (out.length > 1200) return;
    seen.add(x);
    out.push(x);
    if (Array.isArray(x)) {
      x.slice(0, 160).forEach((v) => walk(v, depth + 1));
      return;
    }
    for (const [key, v] of Object.entries(x)) {
      if (!v || typeof v !== "object") continue;
      // On ignore seulement les gros médias, pas les maps joueurs.
      if (skip.test(String(key))) continue;
      walk(v, depth + 1);
    }
  };
  walk(root, 0);
  return out;
}

export function getOnlineStatsSessionKeys(row: any): string[] {
  const keys: any[] = [];
  const push = (v: any) => {
    const s = str(v);
    if (!s) return;
    keys.push(s);
    if (s.includes(":")) {
      const base = s.split(":")[0]?.trim();
      if (base) keys.push(base);
    }
  };

  for (const obj of walkObjects(row, 4)) {
    push(obj?.id);
    push(obj?.matchId);
    push(obj?.match_id);
    push(obj?.resumeId);
    push(obj?.resume_id);
    push(obj?.sessionId);
    push(obj?.session_id);
    push(obj?.onlineMatchId);
    push(obj?.online_match_id);
    push(obj?.lobbyMatchId);
    push(obj?.lobby_match_id);
  }

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
  ].map((x) => x.toLowerCase()));
  const deletedKeys = new Set(["deletedAt", "deleted_at", "statsDeletedAt", "stats_deleted_at"].map((x) => x.toLowerCase()));

  for (const obj of walkObjects(row, 5)) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) continue;
    for (const [key, value] of Object.entries(obj)) {
      const lk = String(key).toLowerCase();
      if (flagKeys.has(lk) && asBool(value)) return true;
      if (deletedKeys.has(lk) && value !== null && value !== undefined && String(value).trim() !== "") return true;
      if (lk === "statstag" || lk === "stats_tag" || lk === "tag") {
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

function firstDeep(row: any, keys: string[]): any {
  const want = new Set(keys.map((k) => k.toLowerCase()));
  for (const obj of walkObjects(row, 5)) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) continue;
    for (const [key, value] of Object.entries(obj)) {
      if (want.has(String(key).toLowerCase()) && value !== undefined && value !== null && value !== "") return value;
    }
  }
  return undefined;
}

function isLikelyOnlineRecord(row: any): boolean {
  for (const obj of walkObjects(row, 4)) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) continue;
    if (obj.online === true || obj.isOnline === true || obj.onlineMatch === true || obj.onlineV10 === true) return true;
    const code = obj.lobbyCode ?? obj.onlineLobbyCode ?? obj.lobbyId ?? obj.roomCode ?? obj.roomId ?? obj.onlineRoomId;
    if (code && String(code).trim().length >= 3) return true;
  }
  const bag = deepTextBag(row);
  return /online|nas-online|x01_online|online_lobby|online-match|onlinematch/.test(bag);
}

function collectPlayersLabel(row: any): string {
  const names: string[] = [];
  const pushName = (p: any) => {
    const n = str(p?.name ?? p?.playerName ?? p?.displayName ?? p?.nickname ?? p?.profileName);
    if (n) names.push(n);
  };
  for (const obj of walkObjects(row, 4)) {
    if (Array.isArray(obj?.players)) obj.players.forEach(pushName);
    if (Array.isArray(obj?.rankings)) obj.rankings.forEach(pushName);
    if (Array.isArray(obj?.perPlayer)) obj.perPlayer.forEach(pushName);
  }
  return uniq(names).slice(0, 6).join(" · ") || "Joueurs inconnus";
}

function getModeLabel(row: any): string {
  const mode = firstDeep(row, ["onlineMode", "gameMode", "mode", "kind", "variant", "sport", "game"]);
  const s = str(mode || "online").replace(/_/g, " ");
  return s || "online";
}

function getDeletedAt(row: any): number | null {
  const v = firstDeep(row, ["deletedAt", "deleted_at", "statsDeletedAt", "stats_deleted_at"]);
  if (v === undefined || v === null || v === "") return null;
  const n = num(v, 0);
  return n || nowTs();
}


function shallowNumber(obj: any, keys: string[]): number | null {
  if (!obj || typeof obj !== "object") return null;
  const want = new Set(keys.map((k) => k.toLowerCase()));
  for (const [key, value] of Object.entries(obj)) {
    if (!want.has(String(key).toLowerCase())) continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function collectNumbersDeep(row: any, keys: string[], opts: { positiveOnly?: boolean } = {}): number[] {
  const want = new Set(keys.map((k) => k.toLowerCase()));
  const out: number[] = [];
  for (const obj of walkObjects(row, 7)) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) continue;
    for (const [key, value] of Object.entries(obj)) {
      if (!want.has(String(key).toLowerCase())) continue;
      const n = Number(value);
      if (!Number.isFinite(n)) continue;
      if (opts.positiveOnly && n <= 0) continue;
      out.push(n);
    }
  }
  return out;
}

function firstPositiveDeep(row: any, keys: string[], fallback = 0): number {
  const values = collectNumbersDeep(row, keys, { positiveOnly: true });
  if (!values.length) return fallback;
  // On prend le maximum : si summary.darts=24 et perPlayer.darts=14/10,
  // le maximum évite de retomber sur une ligne joueur partielle.
  return Math.max(...values);
}

function maxDeep(row: any, keys: string[], fallback = 0): number {
  const values = collectNumbersDeep(row, keys, { positiveOnly: true });
  return values.length ? Math.max(...values) : fallback;
}

function valuesFromMapLike(value: any): number[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const out: number[] = [];
  for (const v of Object.values(value)) {
    const n = Number(v);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

function collectPlayerNameMap(row: any): Record<string, string> {
  const out: Record<string, string> = {};
  const add = (p: any) => {
    if (!p || typeof p !== "object") return;
    const id = str(p?.id ?? p?.playerId ?? p?.profileId ?? p?.pid ?? p?.selectedPlayerId);
    const name = str(p?.name ?? p?.playerName ?? p?.displayName ?? p?.nickname ?? p?.profileName ?? p?.label);
    if (id && name && !out[id]) out[id] = name;
  };

  for (const obj of walkObjects(row, 7)) {
    if (!obj || typeof obj !== "object") continue;
    if (Array.isArray(obj)) obj.forEach(add);
    else {
      add(obj);
      for (const key of ["players", "perPlayer", "rankings"]) {
        if (Array.isArray(obj?.[key])) obj[key].forEach(add);
      }
      for (const key of ["detailedByPlayer", "liveStatsByPlayer", "playerStats", "statsByPlayer"]) {
        const map = obj?.[key];
        if (map && typeof map === "object" && !Array.isArray(map)) Object.values(map).forEach(add);
      }
    }
  }
  return out;
}

function collectPerPlayerRows(row: any): any[] {
  const out: any[] = [];
  const seen = new WeakSet<object>();
  const hasStatsShape = (p: any) => {
    if (!p || typeof p !== "object" || Array.isArray(p)) return false;
    return [
      "darts", "totalDarts", "dartsThrown", "totalThrows", "dt", "points", "totalScore", "pointsScored", "scored",
      "avg3", "avg3D", "moy3", "average3", "bestVisit", "best_checkout", "bestCheckout", "bestCo", "bestCO",
      "score", "remaining", "finalScore", "hits", "miss", "misses", "singles", "doubles", "triples", "bulls", "dbulls",
    ].some((k) => p[k] !== undefined && p[k] !== null);
  };
  const add = (p: any) => {
    if (!p || typeof p !== "object" || Array.isArray(p) || seen.has(p)) return;
    if (!hasStatsShape(p)) return;
    seen.add(p);
    out.push(p);
  };

  for (const obj of walkObjects(row, 7)) {
    if (!obj || typeof obj !== "object") continue;
    if (Array.isArray(obj)) {
      obj.forEach(add);
      continue;
    }
    add(obj);
    for (const key of ["players", "perPlayer", "rankings"]) {
      if (Array.isArray(obj?.[key])) obj[key].forEach(add);
    }
    for (const key of ["detailedByPlayer", "detailedbyplayer", "liveStatsByPlayer", "livestatsbyplayer", "playerStats", "statsByPlayer", "players", "stats", "statsById", "statsByPlayerId"]) {
      const map = obj?.[key];
      if (map && typeof map === "object" && !Array.isArray(map)) Object.values(map).forEach(add);
    }
  }
  return out;
}

function sumFromPerPlayer(row: any, keys: string[]): number {
  let total = 0;
  for (const p of collectPerPlayerRows(row)) {
    const n = shallowNumber(p, keys);
    if (n !== null && Number.isFinite(n) && n > 0) total += n;
  }
  return total;
}

function maxFromPerPlayer(row: any, keys: string[]): number {
  let max = 0;
  for (const p of collectPerPlayerRows(row)) {
    const n = shallowNumber(p, keys);
    if (n !== null && Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

function sumFromNamedMaps(row: any, mapKeys: string[]): number {
  let best = 0;
  const want = new Set(mapKeys.map((k) => k.toLowerCase()));
  for (const obj of walkObjects(row, 6)) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) continue;
    for (const [key, value] of Object.entries(obj)) {
      if (!want.has(String(key).toLowerCase())) continue;
      const sum = valuesFromMapLike(value).filter((n) => n > 0).reduce((a, n) => a + n, 0);
      if (sum > best) best = sum;
    }
  }
  return best;
}

function maxFromNamedMaps(row: any, mapKeys: string[]): number {
  let best = 0;
  const want = new Set(mapKeys.map((k) => k.toLowerCase()));
  for (const obj of walkObjects(row, 6)) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) continue;
    for (const [key, value] of Object.entries(obj)) {
      if (!want.has(String(key).toLowerCase())) continue;
      const values = valuesFromMapLike(value).filter((n) => n > 0);
      if (values.length) best = Math.max(best, ...values);
    }
  }
  return best;
}



type VisitAgg = { darts: number; points: number; bestVisit: number; bestCheckout: number; visits: number };

function scoreFromSegments(segments: any[]): number {
  if (!Array.isArray(segments)) return 0;
  return segments.reduce((a, d: any) => {
    if (d?.isMiss) return a;
    const direct = Number(d?.score);
    if (Number.isFinite(direct)) return a + direct;
    const segRaw = d?.segment ?? d?.value ?? d?.v;
    const mult = Number(d?.multiplier ?? d?.mult ?? d?.m ?? 1) || 1;
    const seg = String(segRaw ?? "").toLowerCase();
    if (seg === "miss" || seg === "m") return a;
    if (seg === "bull") return a + 25;
    if (seg === "dbull" || seg === "doublebull") return a + 50;
    const n = Number(segRaw);
    return Number.isFinite(n) ? a + n * mult : a;
  }, 0);
}

function normalizeVisitEntry(entry: any, fallbackPid?: string): any | null {
  if (Array.isArray(entry)) {
    const vals = entry.map((x) => Number(x)).filter((n) => Number.isFinite(n));
    return { playerId: fallbackPid || "", darts: vals.length, score: vals.reduce((a, n) => a + n, 0), checkout: false };
  }
  if (!entry || typeof entry !== "object") return null;

  const segments = Array.isArray(entry.segments) ? entry.segments : Array.isArray(entry.darts) ? entry.darts : Array.isArray(entry.throws) ? entry.throws : [];
  let darts = Number(entry.dartsCount ?? entry.dartCount ?? entry.dartsThrown ?? entry.totalDarts ?? entry.dt ?? 0);
  if (!Number.isFinite(darts) || darts <= 0) darts = Array.isArray(segments) ? segments.length : 0;
  if ((!darts || darts <= 0) && Array.isArray(entry.values)) darts = entry.values.length;

  let score = Number(entry.score ?? entry.visitScore ?? entry.points ?? entry.total ?? entry.rawScore ?? NaN);
  if (!Number.isFinite(score)) {
    if (Array.isArray(segments) && segments.length) score = scoreFromSegments(segments);
    else if (Array.isArray(entry.values)) score = entry.values.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n)).reduce((a: number, n: number) => a + n, 0);
    else score = 0;
  }
  if (entry.bust === true || entry.isBust === true) score = Number(entry.score ?? 0) || 0;

  const checkout = entry.isCheckout === true || entry.checkout === true || entry.finish === true || Number(entry.remainingAfter) === 0;
  return {
    playerId: str(entry.playerId ?? entry.pid ?? entry.p ?? fallbackPid),
    darts: Math.max(0, Math.round(darts || 0)),
    score: Math.max(0, score || 0),
    checkout,
    ts: entry.ts ?? entry.time ?? entry.createdAt ?? "",
  };
}

function getVisitAgg(row: any): VisitAgg {
  const entries: any[] = [];
  const seen = new Set<string>();
  const add = (visit: any, fallbackPid?: string) => {
    const v = normalizeVisitEntry(visit, fallbackPid);
    if (!v || (!v.darts && !v.score)) return;
    const sig = `${v.playerId}|${v.ts}|${v.darts}|${v.score}|${v.checkout}`;
    if (seen.has(sig)) return;
    seen.add(sig);
    entries.push(v);
  };

  for (const obj of walkObjects(row, 7)) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) continue;

    const visitsMap = obj?.visits;
    if (visitsMap && typeof visitsMap === "object" && !Array.isArray(visitsMap)) {
      for (const [pid, list] of Object.entries(visitsMap)) {
        if (Array.isArray(list)) list.forEach((v) => add(v, String(pid)));
      }
    }

    for (const key of ["visitsHistory", "visitHistory", "turns", "darts"]) {
      const list = obj?.[key];
      if (Array.isArray(list)) list.forEach((v) => add(v));
    }
  }

  let darts = 0;
  let points = 0;
  let bestVisit = 0;
  let bestCheckout = 0;
  for (const v of entries) {
    darts += Number(v.darts || 0);
    points += Number(v.score || 0);
    bestVisit = Math.max(bestVisit, Number(v.score || 0));
    if (v.checkout) bestCheckout = Math.max(bestCheckout, Number(v.score || 0));
  }
  return { darts, points, bestVisit, bestCheckout, visits: entries.length };
}
function getDarts(row: any): number {
  const direct = firstPositiveDeep(row, ["darts", "totalDarts", "totalDartsThrown", "dartsThrown", "dt", "dartsCount", "totalThrows"], 0);
  const perPlayer = sumFromPerPlayer(row, ["darts", "totalDarts", "totalDartsThrown", "dartsThrown", "dt", "dartsCount", "totalThrows"]);
  const byPlayer = sumFromNamedMaps(row, ["dartsByPlayer", "darts", "dartsThrownByPlayer", "totalDartsByPlayer"]);
  const visit = getVisitAgg(row);
  return Math.max(direct, perPlayer, byPlayer, visit.darts, 0);
}

function getTotalScore(row: any): number {
  const perPlayer = sumFromPerPlayer(row, ["points", "totalScore", "pointsScored", "scored", "score", "rawScore"]);
  const byPlayer = sumFromNamedMaps(row, ["pointsByPlayer", "scoreByPlayer", "totalScoreByPlayer", "pointsScoredByPlayer"]);
  const direct = firstPositiveDeep(row, ["totalScore", "totalscore", "points", "pointsScored", "scored", "_sumPoints"], 0);
  const visit = getVisitAgg(row);
  return Math.max(perPlayer, byPlayer, direct, visit.points, 0);
}

function getAvg3(row: any): number {
  const rows = collectPerPlayerRows(row)
    .map((p) => ({
      avg: shallowNumber(p, ["avg3", "avg3D", "moy3", "average3"]),
      darts: shallowNumber(p, ["darts", "totalDarts", "totalDartsThrown", "dartsThrown", "dt", "dartsCount", "totalThrows"]),
    }))
    .filter((x) => x.avg !== null && Number.isFinite(Number(x.avg)) && Number(x.avg) > 0);

  const weighted = rows.filter((x) => x.darts !== null && Number(x.darts) > 0);
  const dartsSum = weighted.reduce((a, x) => a + Number(x.darts || 0), 0);
  if (dartsSum > 0) {
    const v = weighted.reduce((a, x) => a + Number(x.avg || 0) * Number(x.darts || 0), 0) / dartsSum;
    if (Number.isFinite(v) && v > 0) return Math.round(v * 10) / 10;
  }

  const avgMapValues: number[] = [];
  const want = new Set(["avg3byplayer", "avg3dbyplayer", "moy3byplayer", "average3byplayer"]);
  for (const obj of walkObjects(row, 6)) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) continue;
    for (const [key, value] of Object.entries(obj)) {
      if (!want.has(String(key).toLowerCase())) continue;
      avgMapValues.push(...valuesFromMapLike(value).filter((n) => n > 0));
    }
  }
  if (avgMapValues.length) {
    const v = avgMapValues.reduce((a, n) => a + n, 0) / avgMapValues.length;
    return Math.round(v * 10) / 10;
  }

  const direct = firstPositiveDeep(row, ["avg3", "avg3D", "moy3", "average3", "avg3Global"], 0);
  if (direct > 0) return Math.round(direct * 10) / 10;

  const darts = getDarts(row);
  const score = getTotalScore(row);
  return darts > 0 && score > 0 ? Math.round(((score / darts) * 3) * 10) / 10 : 0;
}

function getBestVisit(row: any): number {
  return Math.max(
    maxDeep(row, ["bestVisit", "bv", "best_visit", "maxVisit", "highestVisit"], 0),
    maxFromPerPlayer(row, ["bestVisit", "bv", "best_visit", "maxVisit", "highestVisit"]),
    maxFromNamedMaps(row, ["bestVisitByPlayer", "best_visit_by_player", "bvByPlayer", "maxVisitByPlayer"]),
    getVisitAgg(row).bestVisit,
    0,
  );
}

function getBestCheckout(row: any): number {
  return Math.max(
    maxDeep(row, ["bestCheckout", "bestCo", "bestCO", "highestCheckout", "checkout", "co", "bestFinish"], 0),
    maxFromPerPlayer(row, ["bestCheckout", "bestCo", "bestCO", "highestCheckout", "checkout", "co", "bestFinish"]),
    maxFromNamedMaps(row, ["bestCheckoutByPlayer", "bestCoByPlayer", "bestFinishByPlayer", "highestCheckoutByPlayer"]),
    getVisitAgg(row).bestCheckout,
    0,
  );
}

function getHitPct(row: any): number {
  const darts = getDarts(row);
  if (!darts) return 0;
  const misses = Math.max(
    sumFromPerPlayer(row, ["miss", "misses"]),
    sumFromNamedMaps(row, ["missByPlayer", "missesByPlayer"]),
    0,
  );
  if (misses >= 0 && darts > 0) return Math.max(0, Math.min(100, Math.round(((darts - misses) / darts) * 1000) / 10));
  return 0;
}

function getCreatedAt(row: any): number {
  const raw = firstDeep(row, ["createdAt", "created_at", "date", "ts", "startedAt", "started_at", "finishedAt", "finished_at"]);
  if (typeof raw === "string") {
    const t = Date.parse(raw);
    if (Number.isFinite(t)) return t;
  }
  return num(raw, Date.now());
}

function getUpdatedAt(row: any): number {
  const raw = firstDeep(row, ["updatedAt", "updated_at", "finishedAt", "finished_at", "createdAt", "created_at", "date", "ts"]);
  if (typeof raw === "string") {
    const t = Date.parse(raw);
    if (Number.isFinite(t)) return t;
  }
  return num(raw, getCreatedAt(row));
}

function playerShortName(name: string): string {
  const s = str(name);
  if (!s) return "?";
  return s.length > 14 ? `${s.slice(0, 13)}…` : s;
}

function numberFromStatRow(p: any, keys: string[]): number {
  const direct = shallowNumber(p, keys);
  return direct !== null && Number.isFinite(direct) ? Number(direct) : 0;
}

function playerNameFromStatRow(row: any, p: any, index: number): string {
  const direct = str(p?.name ?? p?.playerName ?? p?.displayName ?? p?.nickname ?? p?.profileName ?? p?.label);
  if (direct) return direct;
  const names = collectPlayerNameMap(row);
  const id = str(p?.id ?? p?.profileId ?? p?.playerId ?? p?.pid ?? p?.uid);
  if (id && names[id]) return names[id];
  return `J${index + 1}`;
}

function collectPerPlayerStatsLabel(row: any): string {
  const rows = collectPerPlayerRows(row);
  if (!rows.length) return "";

  const seen = new Set<string>();
  const parts: string[] = [];
  const startScore = Number(firstDeep(row, ["startScore", "startscore", "x01", "targetScore", "x01StartScore"]));

  rows.forEach((p, index) => {
    const name = playerShortName(playerNameFromStatRow(row, p, index));
    const darts = numberFromStatRow(p, ["darts", "totalDarts", "totalDartsThrown", "dartsThrown", "dt", "dartsCount", "totalThrows"]);
    const total = numberFromStatRow(p, ["points", "totalScore", "totalscore", "pointsScored", "scored", "score", "rawScore", "_sumPoints"]);
    const avg = numberFromStatRow(p, ["avg3", "avg3D", "moy3", "average3"]);
    const bv = numberFromStatRow(p, ["bestVisit", "bv", "best_visit", "maxVisit", "highestVisit"]);
    const rest = Number.isFinite(startScore) && startScore > 0 && total > 0 ? Math.max(0, startScore - total) : NaN;
    if (!darts && !total && !avg && !bv && !Number.isFinite(rest)) return;
    const sig = `${name}|${darts}|${total}|${avg}|${bv}|${rest}`;
    if (seen.has(sig)) return;
    seen.add(sig);
    const bits: string[] = [];
    if (Number.isFinite(rest)) bits.push(`reste ${rest}`);
    if (total > 0) bits.push(`${Math.round(total)} pts`);
    if (darts > 0) bits.push(`${Math.round(darts)}D`);
    if (avg > 0) bits.push(`M3 ${Math.round(avg * 10) / 10}`);
    if (bv > 0) bits.push(`BV ${Math.round(bv)}`);
    parts.push(`${name} ${bits.join(" /")}`);
  });

  return parts.slice(0, 4).join(" · ");
}

function findNamedMap(row: any, mapKeys: string[]): any | null {
  const want = new Set(mapKeys.map((k) => k.toLowerCase()));
  for (const obj of walkObjects(row, 7)) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) continue;
    for (const [key, value] of Object.entries(obj)) {
      if (!want.has(String(key).toLowerCase())) continue;
      if (value && typeof value === "object" && !Array.isArray(value) && valuesFromMapLike(value).length) return value;
    }
  }
  return null;
}

function mapLabel(row: any, title: string, mapKeys: string[], maxItems = 4): string {
  const map = findNamedMap(row, mapKeys);
  if (!map) return "";
  const names = collectPlayerNameMap(row);
  const entries = Object.entries(map)
    .map(([id, value]) => ({ id: String(id), value: Number(value) }))
    .filter((x) => Number.isFinite(x.value));
  if (!entries.length) return "";
  const body = entries.slice(0, maxItems).map((x) => `${playerShortName(names[x.id] || x.id)} ${Math.round(x.value * 10) / 10}`).join(" · ");
  return `${title}: ${body}${entries.length > maxItems ? "…" : ""}`;
}

function collectScoreLabel(row: any): string {
  const explicit = str(firstDeep(row, ["scoreLine", "line", "finalScoreLabel", "scoreLabel"]));
  if (explicit) return explicit;

  const remainingLabel = mapLabel(row, "Restes", ["finalScores", "remaining", "scores", "scoreRemainingByPlayer", "remainingByPlayer"], 4);
  if (remainingLabel) return remainingLabel;

  const scoreLabel = mapLabel(row, "Score", ["scoreByPlayer", "pointsByPlayer", "scoresByPlayer", "finalScoreByPlayer"], 4);
  if (scoreLabel) return scoreLabel;

  const rankings: any[] = [];
  for (const obj of walkObjects(row, 6)) {
    if (Array.isArray(obj?.rankings)) rankings.push(...obj.rankings);
  }
  if (rankings.length) {
    return rankings.slice(0, 4).map((r: any, i: number) => {
      const name = playerShortName(str(r?.name ?? r?.displayName ?? r?.playerName ?? r?.id ?? `J${i + 1}`));
      const score = r?.score ?? r?.points ?? r?.legsWon ?? r?.setsWon ?? "";
      return `${i + 1}. ${name}${score !== "" ? ` ${score}` : ""}`;
    }).join(" · ");
  }

  const perPlayer = collectPerPlayerStatsLabel(row);
  if (perPlayer) return perPlayer;

  return "Score non disponible";
}

function collectDetailLabel(row: any): string {
  const parts: string[] = [];
  const winner = str(firstDeep(row, ["winnerName", "winner", "winnerLabel"]));
  if (winner) parts.push(`Gagnant: ${winner}`);
  const startScore = firstDeep(row, ["startScore", "x01", "targetScore"]);
  if (startScore !== undefined && startScore !== null && String(startScore).trim() !== "") parts.push(`X01 ${startScore}`);
  const legs = firstDeep(row, ["legs", "legsWon", "legsToWin"]);
  const sets = firstDeep(row, ["sets", "setsWon", "setsToWin"]);
  if (legs && Number(legs) > 1) parts.push(`${legs} legs`);
  if (sets && Number(sets) > 1) parts.push(`${sets} sets`);
  return parts.join(" · ");
}

function normalizeCleanupSession(row: any, source: "history" | "store" | "localStorage", idx = 0): OnlineStatsCleanupSession | null {
  if (!row || typeof row !== "object") return null;
  if (!isLikelyOnlineRecord(row)) return null;

  const keys = getOnlineStatsSessionKeys(row);
  const id = keys[0] || `online-cleanup-${source}-${idx}`;
  const matchId = str(row?.matchId ?? row?.payload?.matchId ?? row?.summary?.matchId ?? id) || id;

  return {
    id,
    matchId,
    keys: uniq([id, matchId, ...keys]),
    source,
    mode: getModeLabel(row),
    createdAt: getCreatedAt(row),
    updatedAt: getUpdatedAt(row),
    playersLabel: collectPlayersLabel(row),
    winnerLabel: str(firstDeep(row, ["winnerName", "winner", "winnerLabel"]) || firstDeep(row, ["winnerId"])),
    scoreLabel: collectScoreLabel(row),
    detailLabel: collectDetailLabel(row),
    darts: getDarts(row),
    avg3: getAvg3(row),
    bestVisit: getBestVisit(row),
    bestCheckout: getBestCheckout(row),
    hitPct: getHitPct(row),
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
        if (id) full = { ...row, ...((await History.get(id)) || {}) };
      } catch {}
      const normalized = normalizeCleanupSession(full, "history", i);
      if (normalized) out.push(normalized);
    }
    return out;
  } catch {
    return [];
  }
}

function loadStoreOnlineRows(): OnlineStatsCleanupSession[] {
  try {
    const store: any = loadStore?.() || {};
    const buckets: any[] = [];
    const pushArray = (arr: any) => {
      if (Array.isArray(arr)) buckets.push(...arr);
    };

    // Beaucoup de stats X01 Online exploitables sont dans le store applicatif,
    // alors que dc_online_matches_v1 peut ne contenir qu'un miroir léger.
    pushArray(store.history);
    pushArray(store.saved);
    pushArray(store.matches);
    pushArray(store.onlineMatches);
    pushArray(store.historyRows);
    pushArray(store.historyCache);

    const out: OnlineStatsCleanupSession[] = [];
    buckets.forEach((row, idx) => {
      const normalized = normalizeCleanupSession(row, "store", idx);
      if (normalized) out.push(normalized);
    });
    return out;
  } catch {
    return [];
  }
}

function loadLocalStorageOnlineRows(): OnlineStatsCleanupSession[] {
  if (!isBrowser()) return [];
  const out: OnlineStatsCleanupSession[] = [];
  const seenStorageKeys = new Set<string>();
  for (const key of onlineMatchStorageKeys()) {
    if (seenStorageKeys.has(key)) continue;
    seenStorageKeys.add(key);
    const arr = readJson<any[]>(key, []);
    if (!Array.isArray(arr)) continue;
    arr.forEach((row, idx) => {
      const normalized = normalizeCleanupSession({ ...(row || {}), source: row?.source || "online" }, "localStorage", idx);
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
  return num(s?.darts) + num(s?.bestVisit) + num(s?.bestCheckout) + num(s?.avg3) + num(s?.hitPct);
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
  loadStoreOnlineRows().forEach(push);
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
  for (const storageKey of onlineMatchStorageKeys()) {
    const arr = readJson<any[]>(storageKey, []);
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
    if (changed) writeJson(storageKey, next);
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
    if (session.source !== "history") continue;

    const id = str(session.matchId || session.id);
    if (!id) continue;
    try {
      const full = (await History.get(id)) || session.raw;
      if (!full) continue;
      const next = {
        ...full,
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
    if (session.source === "history") {
      try { await History.remove(session.matchId || session.id); } catch {}
    }

    if (isBrowser()) {
      for (const storageKey of onlineMatchStorageKeys()) {
        const arr = readJson<any[]>(storageKey, []);
        if (!Array.isArray(arr) || !arr.length) continue;
        const next = arr.filter((row) => !getOnlineStatsSessionKeys(row).some((k) => session.keys.includes(k)));
        if (next.length !== arr.length) writeJson(storageKey, next);
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
