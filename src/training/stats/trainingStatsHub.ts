// ============================================
// src/training/stats/trainingStatsHub.ts
// Training V3 — agrégats locaux + sessions détaillées.
// Séparé de l'historique des matchs compétitifs.
// ============================================

import { saveTrainingEvent } from "../sync/trainingEventStore";
import { normalizeTrainingMetrics } from "../sync/trainingNormalize";
import { trainingSyncNowBestEffort } from "../sync/trainingSyncNow";

export type TrainingStatsRow = {
  sessions: number;
  darts: number;
  points: number;
  hits?: number;
  misses?: number;
  successes?: number;
  durationMs?: number;
  bestPoints?: number;
  bestPerformance?: number;
  bestAccuracyPct?: number;
  lastSessionAt?: number;
};

export type ParticipantKind = "player" | "bot";
export type TrainingDetailedMetrics = Record<string, string | number | boolean | null | undefined>;

export type TrainingDetailedSession = {
  id: string;
  modeId: string;
  groupSessionId?: string | null;
  participantId: string | null;
  participantName?: string | null;
  participantType: ParticipantKind;
  teamId?: string | null;
  teamName?: string | null;
  teamLogo?: string | null;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  darts: number;
  hits: number;
  misses: number;
  points: number;
  accuracyPct: number;
  success: boolean;
  config?: any;
  metrics?: TrainingDetailedMetrics;
};

export type TrainingGroupParticipantResult = {
  sessionId: string;
  participantId: string | null;
  participantName?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  teamLogo?: string | null;
  darts: number;
  hits: number;
  points: number;
  accuracyPct: number;
  success: boolean;
  performance: number;
  rank?: number;
  metrics?: TrainingDetailedMetrics;
};

export type TrainingGroupSession = {
  id: string;
  modeId: string;
  participantMode: "players" | "teams";
  startedAt: number;
  endedAt: number;
  config?: any;
  participants: TrainingGroupParticipantResult[];
};

const KEY_V2 = "dc_training_stats_v2";
const KEY_V1 = "dc_training_stats_v1";
const KEY_SESSIONS_V3 = "dc_training_sessions_v3";
const KEY_GROUP_SESSIONS_V4 = "dc_training_group_sessions_v4";
const MAX_DETAILED_SESSIONS = 600;
const MAX_GROUP_SESSIONS = 300;

type ParticipantStats = {
  kind: ParticipantKind;
  global: TrainingStatsRow;
  byMode: Record<string, TrainingStatsRow>;
};

type StoreV2 = {
  global?: TrainingStatsRow;
  byMode?: Record<string, TrainingStatsRow>;
  byParticipant?: Record<string, ParticipantStats>;
};

function canonicalModeId(raw: string) {
  const id = String(raw || "unknown").trim().toLowerCase() || "unknown";
  if (id === "super_bull_training") return "training_super_bull";
  return id;
}

function emptyRow(): TrainingStatsRow {
  return {
    sessions: 0,
    darts: 0,
    points: 0,
    hits: 0,
    misses: 0,
    successes: 0,
    durationMs: 0,
    bestPoints: 0,
    bestPerformance: 0,
    bestAccuracyPct: 0,
    lastSessionAt: 0,
  };
}

function normalizeRow(input?: TrainingStatsRow | null): TrainingStatsRow {
  const src = input || ({} as TrainingStatsRow);
  return {
    sessions: Math.max(0, Number(src.sessions) || 0),
    darts: Math.max(0, Number(src.darts) || 0),
    points: Math.max(0, Number(src.points) || 0),
    hits: Math.max(0, Number(src.hits) || 0),
    misses: Math.max(0, Number(src.misses) || 0),
    successes: Math.max(0, Number(src.successes) || 0),
    durationMs: Math.max(0, Number(src.durationMs) || 0),
    bestPoints: Math.max(0, Number(src.bestPoints) || 0),
    bestPerformance: Math.max(0, Number(src.bestPerformance) || 0),
    bestAccuracyPct: Math.max(0, Number(src.bestAccuracyPct) || 0),
    lastSessionAt: Math.max(0, Number(src.lastSessionAt) || 0),
  };
}

function mergeRows(a?: TrainingStatsRow | null, b?: TrainingStatsRow | null): TrainingStatsRow {
  const x = normalizeRow(a);
  const y = normalizeRow(b);
  return {
    sessions: x.sessions + y.sessions,
    darts: x.darts + y.darts,
    points: x.points + y.points,
    hits: (x.hits || 0) + (y.hits || 0),
    misses: (x.misses || 0) + (y.misses || 0),
    successes: (x.successes || 0) + (y.successes || 0),
    durationMs: (x.durationMs || 0) + (y.durationMs || 0),
    bestPoints: Math.max(x.bestPoints || 0, y.bestPoints || 0),
    bestPerformance: Math.max(x.bestPerformance || 0, y.bestPerformance || 0),
    bestAccuracyPct: Math.max(x.bestAccuracyPct || 0, y.bestAccuracyPct || 0),
    lastSessionAt: Math.max(x.lastSessionAt || 0, y.lastSessionAt || 0),
  };
}

function addSessionToRow(row: TrainingStatsRow, darts: number, points: number, meta?: any) {
  const d = Math.max(0, Math.floor(Number(darts) || 0));
  const p = Math.max(0, Math.round(Number(points) || 0));
  const explicitHits = Number(meta?.hits);
  const hits = Number.isFinite(explicitHits)
    ? Math.max(0, Math.min(d, Math.floor(explicitHits)))
    : 0;
  const explicitMisses = Number(meta?.misses);
  const misses = Number.isFinite(explicitMisses)
    ? Math.max(0, Math.floor(explicitMisses))
    : Math.max(0, d - hits);
  const explicitAccuracy = Number(meta?.accuracyPercent);
  const accuracyPct = Number.isFinite(explicitAccuracy)
    ? Math.max(0, explicitAccuracy)
    : d > 0
    ? (hits / d) * 100
    : 0;
  const endedAt = Math.max(0, Number(meta?.endedAt || Date.now()) || Date.now());

  row.sessions += 1;
  row.darts += d;
  row.points += p;
  row.hits = (row.hits || 0) + hits;
  row.misses = (row.misses || 0) + misses;
  row.successes = (row.successes || 0) + (meta?.success === true ? 1 : 0);
  row.durationMs = (row.durationMs || 0) + Math.max(0, Number(meta?.durationMs) || 0);
  const explicitPerformance = Number(meta?.score ?? meta?.performanceScore);
  const performance = Number.isFinite(explicitPerformance) ? Math.max(0, explicitPerformance) : p;
  row.bestPoints = Math.max(row.bestPoints || 0, p);
  row.bestPerformance = Math.max(row.bestPerformance || 0, performance);
  row.bestAccuracyPct = Math.max(row.bestAccuracyPct || 0, accuracyPct);
  row.lastSessionAt = Math.max(row.lastSessionAt || 0, endedAt);
}

function loadV2(): StoreV2 {
  try {
    const raw = localStorage.getItem(KEY_V2);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as StoreV2) : {};
  } catch {
    return {};
  }
}

function saveV2(store: StoreV2) {
  try {
    localStorage.setItem(KEY_V2, JSON.stringify(store));
    window.dispatchEvent(new Event("dc-training-stats-updated"));
  } catch {}
}

function migrateIfNeeded() {
  try {
    if (localStorage.getItem(KEY_V2)) return;
    const rawV1 = localStorage.getItem(KEY_V1);
    if (!rawV1) return;

    const legacy = JSON.parse(rawV1) as Record<string, TrainingStatsRow>;
    const next: StoreV2 = { global: emptyRow(), byMode: {}, byParticipant: {} };

    for (const [rawModeId, sourceRow] of Object.entries(legacy || {})) {
      const modeId = canonicalModeId(rawModeId);
      next.byMode![modeId] = mergeRows(next.byMode![modeId], sourceRow);
      next.global = mergeRows(next.global, sourceRow);
    }

    saveV2(next);
  } catch {}
}

function cleanEventMeta(meta?: any) {
  if (!meta || typeof meta !== "object") return meta || {};
  const out = { ...meta };
  delete out.emitEvent;
  return out;
}

function emitTrainingEvent(
  modeId: string,
  participantId: string,
  participantType: ParticipantKind,
  darts: number,
  points: number,
  meta?: any
) {
  if (meta?.emitEvent === false) return;

  try {
    const safeMeta = cleanEventMeta(meta);
    const userId =
      (typeof safeMeta?.userId === "string" && safeMeta.userId) ||
      localStorage.getItem("dc_user_id") ||
      undefined;
    const normalized = normalizeTrainingMetrics(modeId, darts, points, safeMeta);

    saveTrainingEvent({
      id:
        (crypto as any)?.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      userId,
      modeId,
      participantId,
      participantType,
      score: normalized.score,
      durationMs: normalized.durationMs,
      meta: normalized.meta,
      createdAt: Date.now(),
      synced: false,
    });
  } catch {}
}

export function recordTrainingSession(
  rawModeId: string,
  darts: number,
  points: number,
  meta?: any
) {
  migrateIfNeeded();
  const modeId = canonicalModeId(rawModeId);
  const store = loadV2();
  store.global = normalizeRow(store.global);
  store.byMode = store.byMode || {};

  const row = normalizeRow(store.byMode[modeId]);
  addSessionToRow(row, darts, points, meta);
  store.byMode[modeId] = row;
  addSessionToRow(store.global, darts, points, meta);
  saveV2(store);

  emitTrainingEvent(
    modeId,
    String(meta?.participantId || "global"),
    meta?.participantType === "bot" ? "bot" : "player",
    darts,
    points,
    meta
  );

  try {
    if (meta?.emitEvent !== false) void trainingSyncNowBestEffort();
  } catch {}
}

export function recordTrainingParticipantSession(
  rawModeId: string,
  participantId: string,
  kind: ParticipantKind,
  darts: number,
  points: number,
  meta?: any
) {
  migrateIfNeeded();
  const modeId = canonicalModeId(rawModeId);
  const pid = String(participantId || "").trim();
  if (!pid) return;

  const store = loadV2();
  store.byParticipant = store.byParticipant || {};

  const participant: ParticipantStats = store.byParticipant[pid] || {
    kind,
    global: emptyRow(),
    byMode: {},
  };
  participant.kind = participant.kind || kind;
  participant.global = normalizeRow(participant.global);
  participant.byMode = participant.byMode || {};

  const row = normalizeRow(participant.byMode[modeId]);
  addSessionToRow(row, darts, points, meta);
  participant.byMode[modeId] = row;
  addSessionToRow(participant.global, darts, points, meta);
  store.byParticipant[pid] = participant;
  saveV2(store);

  emitTrainingEvent(modeId, pid, kind, darts, points, meta);

  try {
    if (meta?.emitEvent !== false) void trainingSyncNowBestEffort();
  } catch {}
}

function loadDetailedSessions(): TrainingDetailedSession[] {
  try {
    const raw = localStorage.getItem(KEY_SESSIONS_V3);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((row) => row && typeof row === "object" && row.id && row.modeId)
      .map((row) => ({
        ...row,
        modeId: canonicalModeId(row.modeId),
      })) as TrainingDetailedSession[];
  } catch {
    return [];
  }
}

function saveDetailedSessions(rows: TrainingDetailedSession[]) {
  try {
    localStorage.setItem(
      KEY_SESSIONS_V3,
      JSON.stringify(rows.slice(0, MAX_DETAILED_SESSIONS))
    );
    window.dispatchEvent(new Event("dc-training-history-updated"));
  } catch {}
}

export function recordTrainingDetailedSession(input: TrainingDetailedSession) {
  const endedAt = Math.max(0, Number(input.endedAt || Date.now()) || Date.now());
  const startedAt = Math.min(endedAt, Math.max(0, Number(input.startedAt || endedAt) || endedAt));
  const darts = Math.max(0, Math.floor(Number(input.darts) || 0));
  const hits = Math.max(0, Math.min(darts, Math.floor(Number(input.hits) || 0)));
  const misses = Math.max(0, Math.floor(Number(input.misses) || Math.max(0, darts - hits)));
  const participantId = input.participantId ? String(input.participantId) : null;

  const record: TrainingDetailedSession = {
    ...input,
    id: String(input.id || `training-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    modeId: canonicalModeId(input.modeId),
    groupSessionId: input.groupSessionId ? String(input.groupSessionId) : null,
    participantId,
    participantName: input.participantName ? String(input.participantName) : null,
    participantType: input.participantType === "bot" ? "bot" : "player",
    teamId: input.teamId ? String(input.teamId) : null,
    teamName: input.teamName ? String(input.teamName) : null,
    teamLogo: input.teamLogo ? String(input.teamLogo) : null,
    startedAt,
    endedAt,
    durationMs: Math.max(0, Number(input.durationMs) || endedAt - startedAt),
    darts,
    hits,
    misses,
    points: Math.max(0, Math.round(Number(input.points) || 0)),
    accuracyPct: Math.max(0, Number(input.accuracyPct) || (darts > 0 ? (hits / darts) * 100 : 0)),
    success: !!input.success,
    config: input.config || {},
    metrics: input.metrics || {},
  };

  const rows = loadDetailedSessions().filter((row) => row.id !== record.id);
  rows.unshift(record);
  saveDetailedSessions(rows);

  const meta = {
    ...(record.metrics || {}),
    sessionId: record.id,
    participantId: record.participantId || undefined,
    participantType: record.participantType,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    durationMs: record.durationMs,
    hits: record.hits,
    misses: record.misses,
    success: record.success,
    accuracyPercent: record.accuracyPct,
    config: record.config,
  };

  if (record.participantId) {
    recordTrainingSession(record.modeId, record.darts, record.points, {
      ...meta,
      emitEvent: false,
    });
    recordTrainingParticipantSession(
      record.modeId,
      record.participantId,
      record.participantType,
      record.darts,
      record.points,
      { ...meta, emitEvent: true }
    );
  } else {
    recordTrainingSession(record.modeId, record.darts, record.points, {
      ...meta,
      emitEvent: true,
    });
  }

  return record;
}

export function getTrainingDetailedSessions(filter?: {
  modeId?: string;
  participantId?: string | null;
  groupSessionId?: string | null;
  limit?: number;
}): TrainingDetailedSession[] {
  const modeId = filter?.modeId ? canonicalModeId(filter.modeId) : "";
  const participantId = filter?.participantId == null ? "" : String(filter.participantId);
  const groupSessionId = filter?.groupSessionId == null ? "" : String(filter.groupSessionId);
  const limit = Math.max(1, Math.min(MAX_DETAILED_SESSIONS, Number(filter?.limit || MAX_DETAILED_SESSIONS)));

  return loadDetailedSessions()
    .filter(
      (row) =>
        (!modeId || row.modeId === modeId) &&
        (!participantId || row.participantId === participantId) &&
        (!groupSessionId || String(row.groupSessionId || "") === groupSessionId)
    )
    .sort((a, b) => b.endedAt - a.endedAt)
    .slice(0, limit);
}

function loadGroupSessions(): TrainingGroupSession[] {
  try {
    const raw = localStorage.getItem(KEY_GROUP_SESSIONS_V4);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row) => row && typeof row === "object" && row.id && row.modeId)
      .map((row) => ({
        ...row,
        id: String(row.id),
        modeId: canonicalModeId(row.modeId),
        participantMode: row.participantMode === "teams" ? "teams" : "players",
        startedAt: Math.max(0, Number(row.startedAt) || 0),
        endedAt: Math.max(0, Number(row.endedAt) || 0),
        participants: Array.isArray(row.participants) ? row.participants : [],
      })) as TrainingGroupSession[];
  } catch {
    return [];
  }
}

function saveGroupSessions(rows: TrainingGroupSession[]) {
  try {
    localStorage.setItem(KEY_GROUP_SESSIONS_V4, JSON.stringify(rows.slice(0, MAX_GROUP_SESSIONS)));
    window.dispatchEvent(new Event("dc-training-group-history-updated"));
  } catch {}
}

export function recordTrainingGroupSession(input: TrainingGroupSession) {
  const endedAt = Math.max(0, Number(input.endedAt || Date.now()) || Date.now());
  const startedAt = Math.min(endedAt, Math.max(0, Number(input.startedAt || endedAt) || endedAt));
  const participants = (Array.isArray(input.participants) ? input.participants : []).map((row, index) => ({
    ...row,
    sessionId: String(row?.sessionId || ""),
    participantId: row?.participantId ? String(row.participantId) : null,
    participantName: row?.participantName ? String(row.participantName) : null,
    teamId: row?.teamId ? String(row.teamId) : null,
    teamName: row?.teamName ? String(row.teamName) : null,
    teamLogo: row?.teamLogo ? String(row.teamLogo) : null,
    darts: Math.max(0, Number(row?.darts) || 0),
    hits: Math.max(0, Number(row?.hits) || 0),
    points: Math.max(0, Number(row?.points) || 0),
    accuracyPct: Math.max(0, Number(row?.accuracyPct) || 0),
    success: !!row?.success,
    performance: Math.max(0, Number(row?.performance) || 0),
    rank: Math.max(1, Number(row?.rank) || index + 1),
    metrics: row?.metrics || {},
  }));

  const record: TrainingGroupSession = {
    ...input,
    id: String(input.id || `training-group-${endedAt}-${Math.random().toString(36).slice(2, 8)}`),
    modeId: canonicalModeId(input.modeId),
    participantMode: input.participantMode === "teams" ? "teams" : "players",
    startedAt,
    endedAt,
    config: input.config || {},
    participants,
  };

  const rows = loadGroupSessions().filter((row) => row.id !== record.id);
  rows.unshift(record);
  saveGroupSessions(rows);
  return record;
}

export function getTrainingGroupSessions(filter?: { modeId?: string; limit?: number }): TrainingGroupSession[] {
  const modeId = filter?.modeId ? canonicalModeId(filter.modeId) : "";
  const limit = Math.max(1, Math.min(MAX_GROUP_SESSIONS, Number(filter?.limit || MAX_GROUP_SESSIONS)));
  return loadGroupSessions()
    .filter((row) => !modeId || row.modeId === modeId)
    .sort((a, b) => b.endedAt - a.endedAt)
    .slice(0, limit);
}

export function getTrainingStatsGlobal(): TrainingStatsRow {
  migrateIfNeeded();
  return normalizeRow(loadV2().global);
}

export function getTrainingStatsByMode(): Record<string, TrainingStatsRow> {
  migrateIfNeeded();
  const store = loadV2();
  const out: Record<string, TrainingStatsRow> = {};

  for (const [rawModeId, row] of Object.entries(store.byMode || {})) {
    const modeId = canonicalModeId(rawModeId);
    out[modeId] = mergeRows(out[modeId], row);
  }

  return out;
}

export function getTrainingParticipantStore(): Record<string, ParticipantStats> {
  migrateIfNeeded();
  const source = loadV2().byParticipant || {};
  const out: Record<string, ParticipantStats> = {};

  for (const [participantId, rawParticipant] of Object.entries(source)) {
    const byMode: Record<string, TrainingStatsRow> = {};
    for (const [rawModeId, row] of Object.entries(rawParticipant?.byMode || {})) {
      const modeId = canonicalModeId(rawModeId);
      byMode[modeId] = mergeRows(byMode[modeId], row);
    }
    out[participantId] = {
      kind: rawParticipant?.kind === "bot" ? "bot" : "player",
      global: normalizeRow(rawParticipant?.global),
      byMode,
    };
  }

  return out;
}

export function getTrainingStats() {
  return {
    global: getTrainingStatsGlobal(),
    byMode: getTrainingStatsByMode(),
    byParticipant: getTrainingParticipantStore(),
    sessions: getTrainingDetailedSessions({ limit: 100 }),
    groupSessions: getTrainingGroupSessions({ limit: 100 }),
  };
}
