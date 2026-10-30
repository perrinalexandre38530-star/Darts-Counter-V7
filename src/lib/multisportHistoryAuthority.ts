// ============================================
// MULTISPORT HISTORY AUTHORITY BRIDGE — W2
// History V4 is the only durable authority for finished matches.
// Legacy per-sport localStorage histories are migration inputs / derived UI caches only.
// ============================================

import { History, type SavedMatch } from "./history";
import { loadPingPongHistory, type PingPongHistoryEntry } from "./pingpongHistory";
import { loadPetanqueHistory, type PetanqueState } from "./petanqueStore";
import { loadMolkkyHistory, type MolkkyHistoryEntry } from "./molkkyStatsStore";
import {
  DARTS_FIREFIGHTER_STATS_KEY,
  isDartsFirefighterRecord,
  loadDartsFirefighterStatsCache,
  normalizeDartsFirefighterRecord,
} from "./dartsFirefighterStats";
import {
  loadTerritoriesHistory,
  normalizeTerritoriesMatch,
  type TerritoriesMatch,
} from "./territories/territoriesStats";

const PINGPONG_CACHE_KEY = "pingpong_history";
const PETANQUE_CACHE_KEY = "dc-petanque-history-v1";
const MOLKKY_CACHE_KEY = "dc_molkky_history_v2";
const TERRITORIES_CACHE_KEY = "dc_territories_history_v1";
const CACHE_OWNER_KEY = "mss_multisport_history_cache_owner_v1";

const AUTHORITY_MODES = new Set(["pingpong", "petanque", "molkky", "darts_firefighter", "territories"]);

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeArray<T = any>(value: any): T[] {
  return Array.isArray(value) ? value : [];
}

function recordTokens(rec: any): string {
  return [
    rec?.kind,
    rec?.mode,
    rec?.sport,
    rec?.game?.mode,
    rec?.summary?.kind,
    rec?.summary?.mode,
    rec?.payload?.kind,
    rec?.payload?.mode,
    rec?.payload?.sport,
    rec?.payload?.summary?.kind,
    rec?.payload?.summary?.mode,
    rec?.payload?.stats?.sport,
    rec?.payload?.stats?.mode,
  ]
    .filter(Boolean)
    .map((value) => clean(value).toLowerCase())
    .join("|");
}

function canonicalMode(rec: any): string | null {
  const tag = recordTokens(rec);
  if (tag.includes("firefighter")) return "darts_firefighter";
  if (tag.includes("territor") || tag.includes("departement") || tag.includes("département") || tag.includes("department")) return "territories";
  if (tag.includes("pingpong") || tag.includes("ping_pong") || tag.includes("ping-pong")) return "pingpong";
  if (tag.includes("petanque") || tag.includes("pétanque")) return "petanque";
  if (tag.includes("molkky") || tag.includes("mölkky")) return "molkky";
  return null;
}

function isFinished(rec: any): boolean {
  const status = clean(rec?.status).toLowerCase();
  if (["in_progress", "in-progress", "active", "running"].includes(status)) return false;
  if (["finished", "done", "ended", "completed", "complete"].includes(status)) return true;
  return Boolean(rec?.finishedAt || rec?.winnerId || rec?.summary?.winnerId || rec?.summary?.winnerPlayerId || rec?.summary?.winnerTeam);
}

function recordId(rec: any): string {
  return clean(rec?.id || rec?.matchId);
}

function recordTs(rec: any): number {
  return Math.max(num(rec?.finishedAt), num(rec?.updatedAt), num(rec?.createdAt), num(rec?.date), num(rec?.ts));
}

function playerIds(rec: any): string[] {
  return safeArray(rec?.players ?? rec?.payload?.players ?? rec?.summary?.players)
    .map((p: any) => clean(p?.id || p?.playerId || p?.profileId || p?.name))
    .filter(Boolean)
    .sort();
}

function scoreSignature(rec: any): string {
  const s = rec?.summary || rec?.payload?.summary || {};
  const p = rec?.payload || {};
  return [
    s?.scoreA ?? p?.scoreA,
    s?.scoreB ?? p?.scoreB,
    s?.setsA ?? p?.setsA,
    s?.setsB ?? p?.setsB,
    s?.winnerTeam ?? p?.winnerTeam,
    rec?.winnerId ?? s?.winnerId ?? s?.winnerPlayerId,
    s?.targetScore ?? p?.targetScore,
  ].map((v) => clean(v)).join(":");
}

function looksEquivalent(a: any, b: any): boolean {
  const modeA = canonicalMode(a);
  const modeB = canonicalMode(b);
  if (!modeA || modeA !== modeB) return false;
  const ta = recordTs(a);
  const tb = recordTs(b);
  if (ta > 0 && tb > 0 && Math.abs(ta - tb) > 120_000) return false;
  const pa = playerIds(a).join("|");
  const pb = playerIds(b).join("|");
  if (pa && pb && pa !== pb) return false;
  const sa = scoreSignature(a);
  const sb = scoreSignature(b);
  if (sa && sb && sa !== sb) return false;
  return Boolean((ta && tb) || (pa && pb) || (sa && sb));
}

function writeJsonArray(key: string, rows: any[]): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, JSON.stringify(Array.isArray(rows) ? rows : []));
  } catch {}
}

function clearDerivedCachesForScope(scopeId: string): void {
  if (typeof localStorage === "undefined") return;
  const nextOwner = clean(scopeId) || "local";
  let previousOwner = "";
  try { previousOwner = clean(localStorage.getItem(CACHE_OWNER_KEY)); } catch {}
  if (previousOwner && previousOwner === nextOwner) return;
  // First W2 run: keep the existing legacy rows long enough to migrate them into
  // History V4. We only clear caches when we KNOW they belonged to another scope.
  if (previousOwner && previousOwner !== nextOwner) {
    for (const key of [PINGPONG_CACHE_KEY, PETANQUE_CACHE_KEY, MOLKKY_CACHE_KEY, DARTS_FIREFIGHTER_STATS_KEY, TERRITORIES_CACHE_KEY]) {
      try { localStorage.removeItem(key); } catch {}
    }
  }
  try { localStorage.setItem(CACHE_OWNER_KEY, nextOwner); } catch {}
}

function pingPongLegacyToCanonical(row: PingPongHistoryEntry): SavedMatch | null {
  const id = clean(row?.id);
  if (!id) return null;
  const when = num(row?.date, Date.now());
  return {
    id,
    matchId: id,
    kind: row?.mode === "training" ? "pingpong_training" : "pingpong",
    sport: "pingpong",
    status: "finished",
    createdAt: when,
    updatedAt: when,
    finishedAt: when,
    players: safeArray(row?.players).map((p: any) => ({ id: clean(p?.id), name: clean(p?.name) })),
    winnerId: clean(row?.winnerId) || null,
    summary: {
      kind: "pingpong",
      mode: row?.mode || "match_1v1",
      scores: row?.scores || {},
      sets: row?.sets || [],
      durationMs: num(row?.durationMs),
      migratedFromLegacy: true,
    },
    payload: {
      kind: "pingpong",
      sport: "pingpong",
      mode: row?.mode || "match_1v1",
      players: row?.players || [],
      winnerId: row?.winnerId || null,
      scores: row?.scores || {},
      sets: row?.sets || [],
      durationMs: num(row?.durationMs),
      legacyHistoryEntry: row,
    },
  } as SavedMatch;
}

function petanqueLegacyToCanonical(st: PetanqueState): SavedMatch | null {
  const id = clean((st as any)?.matchId || (st as any)?.id);
  if (!id) return null;
  const createdAt = num((st as any)?.createdAt, Date.now());
  const updatedAt = num((st as any)?.finishedAt ?? (st as any)?.updatedAt, createdAt);
  const scoreA = num((st as any)?.scoreA);
  const scoreB = num((st as any)?.scoreB);
  const winnerTeam = scoreA === scoreB ? null : scoreA > scoreB ? "A" : "B";
  return {
    id,
    matchId: id,
    kind: "petanque",
    sport: "petanque",
    status: (st as any)?.status === "finished" ? "finished" : "in_progress",
    createdAt,
    updatedAt,
    finishedAt: (st as any)?.status === "finished" ? num((st as any)?.finishedAt, updatedAt) : undefined,
    players: safeArray((st as any)?.players),
    winnerId: winnerTeam,
    summary: {
      kind: "petanque",
      mode: clean((st as any)?.mode) || "simple",
      scoreA,
      scoreB,
      targetScore: num((st as any)?.targetScore, 13),
      winnerTeam,
      endsCount: safeArray((st as any)?.ends).length,
      migratedFromLegacy: true,
    },
    payload: {
      ...(st as any),
      kind: "petanque",
      sport: "petanque",
      matchId: id,
      winnerTeam,
    },
  } as SavedMatch;
}

function molkkyLegacyToCanonical(entry: MolkkyHistoryEntry): SavedMatch | null {
  const id = clean(entry?.id);
  if (!id) return null;
  const state: any = entry?.state && typeof entry.state === "object" ? entry.state : null;
  const summary: any = entry?.summary || {};
  const players = safeArray(state?.players?.length ? state.players : summary?.players).map((p: any) => ({
    id: clean(p?.id || p?.playerId),
    name: clean(p?.name),
    score: num(p?.score),
    throws: num(p?.throws),
    eliminated: Boolean(p?.eliminated),
  }));
  const winnerId = clean(state?.winnerPlayerId || summary?.winnerPlayerId) || null;
  return {
    id,
    matchId: id,
    kind: "molkky",
    sport: "molkky",
    status: entry?.finished ? "finished" : "in_progress",
    createdAt: num(entry?.createdAt, Date.now()),
    updatedAt: num(entry?.updatedAt, entry?.createdAt || Date.now()),
    finishedAt: entry?.finished ? num(state?.finishedAt, entry?.updatedAt || Date.now()) : undefined,
    players,
    winnerId,
    summary: { ...summary, kind: "molkky", mode: entry?.mode || "classic", migratedFromLegacy: true },
    payload: {
      kind: "molkky",
      sport: "molkky",
      mode: entry?.mode || "classic",
      state,
      players,
      winnerId,
      summary,
      legacy: entry?.legacy,
    },
    resume: !entry?.finished && state ? { state, mode: entry?.mode || "classic" } : undefined,
  } as SavedMatch;
}

function firefighterLegacyToCanonical(rowInput: any): SavedMatch | null {
  const row = normalizeDartsFirefighterRecord(rowInput);
  if (!row?.id) return null;
  const id = clean(row.id);
  const ts = num(row.ts, Date.now());
  return {
    id,
    matchId: id,
    kind: "darts_firefighter",
    sport: "darts",
    status: "finished",
    createdAt: num(row.createdAt, ts),
    updatedAt: ts,
    finishedAt: ts,
    players: safeArray(row.players),
    winnerId: clean(row?.summary?.winnerId) || null,
    summary: {
      ...(row.summary || {}),
      kind: "darts_firefighter",
      mode: "darts_firefighter",
      matchStats: row?.summary?.matchStats || {
        totalDarts: row.totalDarts,
        totalHits: row.totalHits,
        totalVisits: row.totalVisits,
        score: row.score,
      },
      migratedFromLegacy: true,
    },
    payload: {
      ...(row.payload || {}),
      kind: "darts_firefighter",
      mode: "darts_firefighter",
      sport: "darts",
      players: safeArray(row.players),
      summary: row.summary || {},
      visits: safeArray(row.visits),
      finalTerritories: safeArray(row.finalTerritories),
    },
  } as SavedMatch;
}

function territoriesLegacyToCanonical(rowInput: TerritoriesMatch): SavedMatch | null {
  const row = normalizeTerritoriesMatch(rowInput as any);
  if (!row?.id) return null;
  const id = clean(row.id);
  const ts = num(row.ts, Date.now());
  const winnerId = clean((row as any)?.winnerId) || `team-${num(row.winnerTeam)}`;
  return {
    id,
    matchId: id,
    kind: "territories",
    mode: "territories",
    sport: "darts",
    status: "finished",
    createdAt: ts,
    updatedAt: ts,
    finishedAt: ts,
    players: safeArray(row.players),
    winnerId,
    summary: {
      kind: "territories",
      mode: "territories",
      mapId: row.mapId,
      mapName: row.mapName || row.mapId,
      teams: row.teams,
      teamSize: row.teamSize,
      objective: row.objective,
      rounds: row.rounds,
      winnerTeam: row.winnerTeam,
      gameMode: row.gameMode,
      victory: row.victory,
      durationMs: row.durationMs,
      migratedFromLegacy: true,
    },
    payload: {
      kind: "territories",
      mode: "territories",
      sport: "darts",
      match: row,
      visits: safeArray(row.visitLog),
      visitHistory: safeArray(row.visitLog),
      summary: {
        kind: "territories",
        mode: "territories",
        mapId: row.mapId,
        mapName: row.mapName || row.mapId,
        winnerTeam: row.winnerTeam,
        rounds: row.rounds,
      },
      stats: {
        sport: "territories",
        mode: "territories",
        global: { ...(row as any) },
      },
    },
  } as SavedMatch;
}

function pingPongFromCanonical(rec: any): PingPongHistoryEntry | null {
  if (canonicalMode(rec) !== "pingpong") return null;
  const id = recordId(rec);
  if (!id) return null;
  const payload = rec?.payload || {};
  const summary = rec?.summary || payload?.summary || {};
  const legacy = payload?.legacyHistoryEntry;
  const players = safeArray(rec?.players?.length ? rec.players : payload?.players).map((p: any) => ({ id: clean(p?.id), name: clean(p?.name) }));
  return {
    id,
    date: recordTs(rec) || Date.now(),
    mode: (legacy?.mode || payload?.mode || summary?.mode || "match_1v1") as any,
    players,
    winnerId: clean(rec?.winnerId || payload?.winnerId || legacy?.winnerId) || undefined,
    scores: legacy?.scores || payload?.scores || summary?.scores || undefined,
    sets: legacy?.sets || payload?.sets || summary?.sets || undefined,
    durationMs: num(legacy?.durationMs ?? payload?.durationMs ?? summary?.durationMs) || undefined,
  };
}

function petanqueFromCanonical(rec: any): PetanqueState | null {
  if (canonicalMode(rec) !== "petanque") return null;
  const id = recordId(rec);
  if (!id) return null;
  const outer = rec?.payload || {};
  const inner = outer?.payload && typeof outer.payload === "object" ? outer.payload : null;
  const source = inner || outer?.state || outer;
  const summary = rec?.summary || outer?.summary || {};
  return {
    ...(source || {}),
    matchId: clean(source?.matchId || source?.gameId || id) || id,
    createdAt: num(source?.createdAt, num(rec?.createdAt, Date.now())),
    updatedAt: num(source?.updatedAt, recordTs(rec) || Date.now()),
    finishedAt: isFinished(rec) ? num(source?.finishedAt, recordTs(rec) || Date.now()) : undefined,
    status: isFinished(rec) ? "finished" : "active",
    mode: clean(source?.mode || summary?.mode) || "simple",
    targetScore: num(source?.targetScore ?? summary?.targetScore, 13),
    scoreA: num(source?.scoreA ?? summary?.scoreA),
    scoreB: num(source?.scoreB ?? summary?.scoreB),
    ends: safeArray(source?.ends),
    measurements: safeArray(source?.measurements),
    teams: source?.teams ?? outer?.teams,
    players: safeArray(source?.players?.length ? source.players : rec?.players),
    configSnapshot: source?.configSnapshot,
    configVersion: source?.configVersion,
    meta: source?.meta,
  } as PetanqueState;
}

function molkkyFromCanonical(rec: any): MolkkyHistoryEntry | null {
  if (canonicalMode(rec) !== "molkky") return null;
  const id = recordId(rec);
  if (!id) return null;
  const payload = rec?.payload || {};
  const summary = rec?.summary || payload?.summary || {};
  const state = payload?.state || payload?.payload?.state || rec?.resume?.state || null;
  const finished = isFinished(rec);
  return {
    id,
    sport: "molkky",
    mode: clean(payload?.mode || summary?.mode || rec?.mode) || "classic",
    createdAt: num(rec?.createdAt, Date.now()),
    updatedAt: num(rec?.updatedAt, recordTs(rec) || Date.now()),
    finished,
    inProgress: !finished,
    state,
    summary,
    legacy: payload?.legacy,
  };
}

function territoriesFromCanonical(rec: any): TerritoriesMatch | null {
  if (canonicalMode(rec) !== "territories") return null;
  const payload = rec?.payload || {};
  const summary = rec?.summary || payload?.summary || {};
  const global = payload?.stats?.global || {};
  const direct = [payload?.match, payload?.territoriesMatch, rec?.match, rec?.territoriesMatch];
  for (const candidate of direct) {
    const normalized = normalizeTerritoriesMatch(candidate);
    if (normalized?.id && normalized?.mapId) return normalized;
  }
  return normalizeTerritoriesMatch({
    id: recordId(rec),
    ts: recordTs(rec),
    mapId: global?.mapId ?? summary?.mapId,
    mapName: global?.mapName ?? summary?.mapName,
    teams: global?.teams ?? summary?.teams,
    teamSize: global?.teamSize ?? summary?.teamSize,
    objective: global?.objective ?? summary?.objective,
    rounds: global?.rounds ?? summary?.rounds,
    winnerTeam: global?.winnerTeam ?? summary?.winnerTeam,
    captured: global?.captured ?? summary?.captured,
    domination: global?.domination ?? summary?.domination,
    dominationValue: global?.dominationValue ?? summary?.dominationValue,
    darts: global?.darts ?? summary?.darts,
    steals: global?.steals ?? summary?.steals,
    lost: global?.lost ?? summary?.lost,
    fortresses: global?.fortresses ?? summary?.fortresses,
    breaches: global?.breaches ?? summary?.breaches,
    visits: global?.visits ?? summary?.visits,
    bulls: global?.bulls ?? summary?.bulls,
    dbulls: global?.dbulls ?? summary?.dbulls,
    misses: global?.misses ?? summary?.misses,
    bullReplays: global?.bullReplays ?? summary?.bullReplays,
    missPasses: global?.missPasses ?? summary?.missPasses,
    captureValueTotal: global?.captureValueTotal ?? summary?.captureValueTotal,
    maxCaptureValue: global?.maxCaptureValue ?? summary?.maxCaptureValue,
    exactCaptures: global?.exactCaptures ?? summary?.exactCaptures,
    gteCaptures: global?.gteCaptures ?? summary?.gteCaptures,
    playerStats: global?.playerStats ?? summary?.playerStats,
    visitLog: global?.visitLog ?? payload?.visitHistory ?? payload?.events,
    finalTerritories: global?.finalTerritories,
    configSnapshot: global?.configSnapshot ?? summary?.configSnapshot,
    schemaVersion: global?.schemaVersion ?? summary?.schemaVersion,
    gameMode: global?.gameMode ?? summary?.gameMode,
    victory: global?.victory ?? summary?.victory,
    durationMs: global?.durationMs ?? summary?.durationMs,
    players: rec?.players ?? summary?.players,
    owners: payload?.match?.owners ?? summary?.owners,
  } as any);
}

async function canonicalFullRows(): Promise<any[]> {
  const api: any = History as any;
  const light = await api.list();
  const candidates = safeArray(light).filter((rec: any) => AUTHORITY_MODES.has(canonicalMode(rec) || ""));
  const out: any[] = [];
  for (let i = 0; i < candidates.length; i += 16) {
    const batch = candidates.slice(i, i + 16);
    const rows = await Promise.all(batch.map(async (rec: any) => {
      const id = recordId(rec);
      if (!id || typeof api.get !== "function") return rec;
      try { return (await api.get(id)) || rec; } catch { return rec; }
    }));
    out.push(...rows);
  }
  return out;
}

export async function migrateLegacyMultisportHistoriesToHistoryV4(): Promise<{ imported: number; skipped: number }> {
  const existing = safeArray(await (History as any).list());
  const ids = new Set(existing.map(recordId).filter(Boolean));
  const knownRows = [...existing];
  const candidates: SavedMatch[] = [];

  for (const row of loadPingPongHistory()) {
    const rec = pingPongLegacyToCanonical(row);
    if (rec) candidates.push(rec);
  }
  for (const row of loadPetanqueHistory({ limit: 2000 })) {
    const rec = petanqueLegacyToCanonical(row);
    if (rec) candidates.push(rec);
  }
  for (const row of loadMolkkyHistory()) {
    const rec = molkkyLegacyToCanonical(row);
    if (rec) candidates.push(rec);
  }
  for (const row of loadDartsFirefighterStatsCache()) {
    const rec = firefighterLegacyToCanonical(row);
    if (rec) candidates.push(rec);
  }
  for (const row of loadTerritoriesHistory()) {
    const rec = territoriesLegacyToCanonical(row);
    if (rec) candidates.push(rec);
  }

  let imported = 0;
  let skipped = 0;
  for (const rec of candidates) {
    const id = recordId(rec);
    if (!id || ids.has(id) || knownRows.some((existingRow) => looksEquivalent(rec, existingRow))) {
      skipped += 1;
      continue;
    }
    try {
      await History.upsert(rec);
      ids.add(id);
      knownRows.push(rec);
      imported += 1;
    } catch {
      skipped += 1;
    }
    if (imported > 0 && imported % 8 === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  return { imported, skipped };
}

export async function rebuildMultisportDerivedHistoryCaches(): Promise<void> {
  const rows = await canonicalFullRows();

  const pingpong = rows.map(pingPongFromCanonical).filter(Boolean) as PingPongHistoryEntry[];
  pingpong.sort((a, b) => num(b.date) - num(a.date));
  writeJsonArray(PINGPONG_CACHE_KEY, pingpong);

  const petanque = rows.map(petanqueFromCanonical).filter((row): row is PetanqueState => Boolean(row && row.status === "finished"));
  petanque.sort((a, b) => num(b.updatedAt) - num(a.updatedAt));
  writeJsonArray(PETANQUE_CACHE_KEY, petanque);

  const canonicalMolkky = rows.map(molkkyFromCanonical).filter(Boolean) as MolkkyHistoryEntry[];
  // Keep a currently active local session if it has not reached History yet.
  // Finished rows, however, always come from History V4.
  const activeLocalMolkky = loadMolkkyHistory().filter((row) => row?.inProgress && !row?.finished);
  const molkkyById = new Map<string, MolkkyHistoryEntry>();
  for (const row of canonicalMolkky) molkkyById.set(clean(row.id), row);
  for (const row of activeLocalMolkky) if (!molkkyById.has(clean(row.id))) molkkyById.set(clean(row.id), row);
  const molkky = Array.from(molkkyById.values()).sort((a, b) => num(a.createdAt) - num(b.createdAt));
  writeJsonArray(MOLKKY_CACHE_KEY, molkky);

  const firefighter = rows
    .filter(isDartsFirefighterRecord)
    .map(normalizeDartsFirefighterRecord)
    .filter(Boolean)
    .sort((a: any, b: any) => num(b?.ts) - num(a?.ts));
  // This key is now only a fast visual cache; lifetime reads use History V4.
  writeJsonArray(DARTS_FIREFIGHTER_STATS_KEY, firefighter.slice(0, 250));

  const territories = rows
    .map(territoriesFromCanonical)
    .filter(Boolean) as TerritoriesMatch[];
  territories.sort((a, b) => num(b?.ts) - num(a?.ts));
  // This key is now only a fast visual cache; lifetime reads use History V4.
  writeJsonArray(TERRITORIES_CACHE_KEY, territories.slice(0, 250));

  try { window.dispatchEvent(new Event("dc-pingpong-history-updated")); } catch {}
  try { window.dispatchEvent(new Event("dc-petanque-history-updated")); } catch {}
  try { window.dispatchEvent(new Event("dc-molkky-history-updated")); } catch {}
  try { window.dispatchEvent(new Event("dc-darts-firefighter-updated")); } catch {}
  try { window.dispatchEvent(new Event("dc-territories-updated")); } catch {}
}

export function installMultisportHistoryAuthorityBridge(scopeId = "local"): () => void {
  if (typeof window === "undefined") return () => {};
  clearDerivedCachesForScope(scopeId);

  let stopped = false;
  let timer: number | null = null;
  let running = false;
  let queued = false;
  let initialMigrationDone = false;

  const run = async () => {
    if (stopped) return;
    if (running) {
      queued = true;
      return;
    }
    running = true;
    try {
      if (!initialMigrationDone) {
        await migrateLegacyMultisportHistoriesToHistoryV4();
        initialMigrationDone = true;
      }
      await rebuildMultisportDerivedHistoryCaches();
    } catch (error) {
      try { console.warn("[multisport-history-authority] reconcile failed", error); } catch {}
    } finally {
      running = false;
      if (queued && !stopped) {
        queued = false;
        schedule(180);
      }
    }
  };

  const schedule = (delay = 240) => {
    if (stopped) return;
    if (timer != null) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      void run();
    }, delay);
  };

  const onHistoryUpdated = () => schedule(300);
  window.addEventListener("dc-history-updated", onHistoryUpdated);
  schedule(80);

  return () => {
    stopped = true;
    if (timer != null) window.clearTimeout(timer);
    timer = null;
    window.removeEventListener("dc-history-updated", onHistoryUpdated);
  };
}
