import {

    recordTrainingDetailedSession,
  
    type TrainingDetailedMetrics,
  
    type TrainingDetailedSession,
  
  } from "./trainingStatsHub";
  
  
  export function recordSoloTrainingResult(input: {
  
    modeId: string;
  
    config?: any;
  
    participantIds?: string[];
  
    startedAt: number;
  
    endedAt?: number;
  
    darts: number;
  
    hits: number;
  
    points: number;
  
    success: boolean;
  
    metrics?: TrainingDetailedMetrics;
  
  }) {
  
    const endedAt = Math.max(0, Number(input.endedAt || Date.now()) || Date.now());
  
    const startedAt = Math.min(
  
      endedAt,
  
      Math.max(0, Number(input.startedAt || endedAt) || endedAt)
  
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
  
  
    const record: TrainingDetailedSession = {
  
      id: `training-${String(input.modeId || "unknown")}-${endedAt}-${Math.random()
  
        .toString(36)
  
        .slice(2, 8)}`,
  
      modeId: String(input.modeId || "unknown"),
  
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
  
    };
  
  
    return recordTrainingDetailedSession(record);
  
  }
  
  
  