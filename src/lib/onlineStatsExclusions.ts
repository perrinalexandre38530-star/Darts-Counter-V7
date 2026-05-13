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
import { scopedStorageKey } from "./storage";

const ONLINE_STATS_EXCLUDED_KEY = "dc_online_stats_excluded_ids_v1";
const ONLINE_MATCHES_KEY = "dc_online_matches_v1";

export type OnlineStatsCleanupSession = {
  id: string;
  matchId: string;
  keys: string[];
  source: "history" | "localStorage";
  mode: string;
  createdAt: number;
  updatedAt: number;
  playersLabel: string;
  winnerLabel: string;
  darts: number;
  avg3: number;
  bestVisit: number;
  bestCheckout: number;
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

function walkObjects(root: any, maxDepth = 4): any[] {
  const out: any[] = [];
  const seen = new WeakSet<object>();
  const walk = (x: any, depth: number) => {
    if (!x || typeof x !== "object" || depth > maxDepth) return;
    if (seen.has(x)) return;
    seen.add(x);
    out.push(x);
    if (Array.isArray(x)) {
      x.slice(0, 40).forEach((v) => walk(v, depth + 1));
      return;
    }
    for (const key of [
      "payload",
      "summary",
      "stats",
      "meta",
      "statsMeta",
      "cleanup",
      "game",
      "config",
      "cfg",
      "result",
      "state",
    ]) {
      const v = x?.[key];
      if (v && typeof v === "object") walk(v, depth + 1);
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

function getStatsNumber(row: any, keys: string[], fallback = 0): number {
  const direct = firstDeep(row, keys);
  return num(direct, fallback);
}

function getDarts(row: any): number {
  return getStatsNumber(row, ["darts", "totalDarts", "dartsThrown", "dt", "dartsCount"], 0);
}

function getTotalScore(row: any): number {
  return getStatsNumber(row, ["totalScore", "totalscore", "points", "_sumPoints"], 0);
}

function getAvg3(row: any): number {
  const avg = getStatsNumber(row, ["avg3", "avg3D", "moy3", "average3"], 0);
  if (avg > 0) return Math.round(avg * 10) / 10;
  const darts = getDarts(row);
  const score = getTotalScore(row);
  return darts > 0 ? Math.round(((score / darts) * 3) * 10) / 10 : 0;
}

function getCreatedAt(row: any): number {
  return num(firstDeep(row, ["createdAt", "created_at", "date", "ts", "startedAt", "started_at", "finishedAt", "finished_at"]), Date.now());
}

function getUpdatedAt(row: any): number {
  return num(firstDeep(row, ["updatedAt", "updated_at", "finishedAt", "finished_at", "createdAt", "created_at", "date", "ts"]), getCreatedAt(row));
}

function normalizeCleanupSession(row: any, source: "history" | "localStorage", idx = 0): OnlineStatsCleanupSession | null {
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
    darts: getDarts(row),
    avg3: getAvg3(row),
    bestVisit: getStatsNumber(row, ["bestVisit", "bv", "best_visit"], 0),
    bestCheckout: getStatsNumber(row, ["bestCheckout", "bestCo", "bc", "best_checkout"], 0),
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

export async function listOnlineStatsCleanupSessions(): Promise<OnlineStatsCleanupSession[]> {
  const byId = new Map<string, OnlineStatsCleanupSession>();
  const push = (session: OnlineStatsCleanupSession) => {
    const key = session.keys[0] || session.id;
    const existing = byId.get(key);
    if (!existing) byId.set(key, session);
    else {
      byId.set(key, {
        ...existing,
        ...session,
        source: existing.source === "history" ? existing.source : session.source,
        excludedFromStats: existing.excludedFromStats || session.excludedFromStats,
        keys: uniq([...(existing.keys || []), ...(session.keys || [])]),
      });
    }
  };

  (await loadHistoryOnlineRows()).forEach(push);
  loadLocalStorageOnlineRows().forEach(push);

  return Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt);
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
