// =============================================================
// src/training/lib/trainingCanonical.ts
// Métrique canonique des classements Training.
// =============================================================

export type TrainingMetric = "time" | "score";

export function getTrainingModeMetric(_modeId: string | null | undefined): TrainingMetric {
  // Tous les drills Training actuellement jouables utilisent une performance
  // où "plus haut = meilleur". Time Attack = points max dans un temps fixé.
  return "score";
}

export function canonicalFromRow(
  modeId: string | null | undefined,
  row: { best_score?: any; best_time_ms?: any }
) {
  const metric = getTrainingModeMetric(modeId);
  if (metric === "time") {
    const value = Number(row.best_time_ms);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  const value = Number(row.best_score);
  return Number.isFinite(value) ? value : null;
}

export function formatCanonical(
  modeId: string | null | undefined,
  row: { best_score?: any; best_time_ms?: any }
) {
  const metric = getTrainingModeMetric(modeId);
  const value = canonicalFromRow(modeId, row);
  if (value == null) return "—";
  return metric === "time" ? `${Math.round(value / 1000)}s` : `${Math.round(value)}`;
}

export function performanceFromEvent(
  modeId: string | null | undefined,
  ev: { score?: any; duration_ms?: any; durationMs?: any }
): number | null {
  const metric = getTrainingModeMetric(modeId);
  if (metric === "time") {
    const duration = Number(ev.duration_ms ?? ev.durationMs);
    if (!Number.isFinite(duration) || duration <= 0) return null;
    return 1_000_000 / duration;
  }

  const score = Number(ev.score);
  return Number.isFinite(score) ? score : null;
}

export function formatMetricLabel(modeId: string | null | undefined): string {
  return getTrainingModeMetric(modeId) === "time" ? "Temps (sec)" : "Score";
}
