import {
  recordTrainingDetailedSession,
  type TrainingDetailedMetrics,
  type TrainingDetailedSession,
} from "./trainingStatsHub";
import { History } from "../../lib/history";
import { buildDartsTelemetry, normalizeDart } from "../../lib/dartsTelemetry";

export type TrainingVisitLogRow = {
  id?: string;
  visitIndex?: number;
  roundIndex?: number;
  startedAt?: number;
  endedAt?: number;
  darts: any[];
  score?: number;
  result?: string | null;
  bust?: boolean;
  meta?: Record<string, any>;
};

/**
 * Adds one exact, ordered Training visit to a local session buffer.
 * The recorder later injects the participant id and canonicalizes S/D/T/BULL/DBULL/MISS.
 */
export function appendTrainingVisit(
  target: TrainingVisitLogRow[],
  rawDarts: any[],
  meta: Omit<TrainingVisitLogRow, "darts" | "visitIndex"> = {},
): TrainingVisitLogRow | null {
  if (!Array.isArray(target)) return null;
  const darts = (Array.isArray(rawDarts) ? rawDarts : [])
    .map((dart) => normalizeDart(dart))
    .filter(Boolean)
    .map((dart) => ({ ...dart }));
  if (!darts.length) return null;

  const endedAt = Math.max(0, Number(meta.endedAt || Date.now()) || Date.now());
  const startedAt = Math.max(0, Number(meta.startedAt || endedAt) || endedAt);
  const row: TrainingVisitLogRow = {
    ...meta,
    id: meta.id || `training-visit-${target.length}-${endedAt}`,
    visitIndex: target.length,
    startedAt: Math.min(startedAt, endedAt),
    endedAt,
    darts,
    score: darts.reduce((sum, dart: any) => sum + (Number(dart?.score) || 0), 0),
  };
  target.push(row);
  return row;
}

function normalizeTrainingVisitHistory(
  rawRows: any,
  participantId: string | null,
  startedAt: number,
): TrainingVisitLogRow[] {
  const rows = Array.isArray(rawRows) ? rawRows : [];
  return rows
    .map((raw: any, index: number) => {
      const rawDarts = Array.isArray(raw?.darts)
        ? raw.darts
        : Array.isArray(raw)
        ? raw
        : raw?.dart != null
        ? [raw.dart]
        : [];
      const darts = rawDarts
        .map((dart: any) => normalizeDart(dart))
        .filter(Boolean)
        .map((dart: any) => ({ ...dart }));
      if (!darts.length) return null;
      const endedAt = Math.max(
        startedAt,
        Number(raw?.endedAt || raw?.timestamp || raw?.at || startedAt + index) || startedAt + index,
      );
      const rowStartedAt = Math.max(
        startedAt,
        Number(raw?.startedAt || raw?.timestamp || raw?.at || endedAt) || endedAt,
      );
      return {
        ...raw,
        id: String(raw?.id || `training-visit-${index}-${endedAt}`),
        playerId: participantId || "training-player",
        participantId: participantId || "training-player",
        visitIndex: Math.max(0, Number(raw?.visitIndex ?? index) || index),
        startedAt: Math.min(rowStartedAt, endedAt),
        endedAt,
        darts,
        score: darts.reduce((sum: number, dart: any) => sum + (Number(dart?.score) || 0), 0),
      } as any;
    })
    .filter(Boolean) as TrainingVisitLogRow[];
}

function playerLite(input: any, participantId: string | null) {
  const activeParticipant = input.config?.activeParticipant && typeof input.config.activeParticipant === "object"
    ? input.config.activeParticipant
    : null;
  return {
    id: participantId || "training-player",
    name: activeParticipant?.name ? String(activeParticipant.name) : "Joueur Training",
    avatarDataUrl: activeParticipant?.avatarDataUrl || activeParticipant?.avatarUrl || null,
    teamId: activeParticipant?.teamId ? String(activeParticipant.teamId) : null,
    teamName: activeParticipant?.teamName ? String(activeParticipant.teamName) : null,
  };
}

export function recordSoloTrainingResult(input: {
  modeId: string;
  /** Reuse an existing global History id to avoid duplicate Training cards. */
  historyId?: string;
  config?: any;
  participantIds?: string[];
  startedAt: number;
  endedAt?: number;
  darts: number;
  hits: number;
  points: number;
  success: boolean;
  metrics?: TrainingDetailedMetrics;
  /** Exact ordered visits. Aggregate scores are never used to infer S/D/T. */
  visitHistory?: TrainingVisitLogRow[] | any[];
}) {
  const endedAt = Math.max(0, Number(input.endedAt || Date.now()) || Date.now());
  const startedAt = Math.min(
    endedAt,
    Math.max(0, Number(input.startedAt || endedAt) || endedAt),
  );
  const darts = Math.max(0, Math.floor(Number(input.darts) || 0));
  const hits = Math.max(0, Math.min(darts, Math.floor(Number(input.hits) || 0)));
  const participantId = (Array.isArray(input.participantIds) ? input.participantIds : [])
    .map((id) => String(id || "").trim())
    .find(Boolean) || null;
  const activeParticipant = input.config?.activeParticipant && typeof input.config.activeParticipant === "object"
    ? input.config.activeParticipant
    : null;
  const configForHistory = { ...(input.config || {}) };
  delete (configForHistory as any).activeParticipant;
  delete (configForHistory as any).trainingParticipants;

  const modeId = String(input.modeId || "unknown");
  const id = String(input.historyId || `training-${modeId}-${endedAt}-${Math.random().toString(36).slice(2, 8)}`);
  const visitHistory = normalizeTrainingVisitHistory(input.visitHistory, participantId, startedAt);
  const telemetrySeed = {
    id,
    kind: modeId,
    mode: modeId,
    sport: "darts",
    players: [playerLite(input, participantId)],
    visitHistory,
    visits: visitHistory,
    dartLog: visitHistory,
  };
  const telemetry = visitHistory.length ? buildDartsTelemetry(telemetrySeed, telemetrySeed) : null;

  const record: TrainingDetailedSession = {
    id,
    modeId,
    groupSessionId: input.config?.groupSessionId ? String(input.config.groupSessionId) : null,
    participantId,
    participantName: activeParticipant?.name ? String(activeParticipant.name) : null,
    participantType: "player",
    teamId: activeParticipant?.teamId ? String(activeParticipant.teamId) : null,
    teamName: activeParticipant?.teamName ? String(activeParticipant.teamName) : null,
    teamLogo: activeParticipant?.teamLogo ? String(activeParticipant.teamLogo) : null,
    startedAt,
    endedAt,
    durationMs: Math.max(0, endedAt - startedAt),
    darts,
    hits,
    misses: Math.max(0, darts - hits),
    points: Math.max(0, Math.round(Number(input.points) || 0)),
    accuracyPct: darts > 0 ? (hits / darts) * 100 : 0,
    success: !!input.success,
    config: configForHistory,
    metrics: input.metrics || {},
    visitHistory,
    telemetry,
    telemetryCoverage: telemetry?.visits?.length ? "exact" : "missing",
  };

  const saved = recordTrainingDetailedSession(record);

  // Mirror Training into the canonical History store so future statistics can be
  // rebuilt from the same exact dart path as every other Darts mode.
  const player = playerLite(input, participantId);
  void History.upsert({
    id,
    matchId: id,
    kind: modeId,
    status: "finished",
    createdAt: startedAt,
    updatedAt: endedAt,
    sport: "darts",
    mode: modeId,
    players: [player],
    winnerId: input.success ? player.id : null,
    game: {
      mode: modeId,
      sport: "darts",
      isTraining: true,
      ...(configForHistory || {}),
    },
    summary: {
      kind: modeId,
      mode: modeId,
      sport: "darts",
      title: modeId,
      status: "finished",
      finished: true,
      isTraining: true,
      darts,
      hits,
      misses: Math.max(0, darts - hits),
      points: record.points,
      success: record.success,
      durationMs: record.durationMs,
      telemetryCoverage: record.telemetryCoverage,
      players: [player],
      perPlayer: [{
        playerId: player.id,
        profileId: player.id,
        id: player.id,
        name: player.name,
        darts,
        hits,
        misses: Math.max(0, darts - hits),
        points: record.points,
        success: record.success,
      }],
    },
    payload: {
      kind: modeId,
      mode: modeId,
      sport: "darts",
      isTraining: true,
      finished: true,
      config: configForHistory,
      metrics: record.metrics,
      stats: record,
      players: [player],
      visitHistory,
      visits: visitHistory,
      events: visitHistory,
      dartLog: visitHistory,
      telemetry,
      telemetryCoverage: record.telemetryCoverage,
    },
    visitHistory,
    visits: visitHistory,
    events: visitHistory,
    dartLog: visitHistory,
    telemetry,
    telemetryCoverage: record.telemetryCoverage,
  }).catch((error) => {
    console.warn("Training history telemetry save failed", error);
  });

  return saved;
}
