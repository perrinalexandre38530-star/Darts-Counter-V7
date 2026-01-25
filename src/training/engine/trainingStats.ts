// ============================================
// TRAINING — Calcul statistiques
// ============================================

import { TrainingSessionState, TrainingStats } from "./trainingTypes";

export function computeTrainingStats(
  state: TrainingSessionState
): TrainingStats {
  const dartsThrown = state.darts.length;
  const hits = state.darts.filter((d) => d.hit).length;
  const accuracy = dartsThrown > 0 ? hits / dartsThrown : 0;

  const durationMs =
    (state.endedAt ?? Date.now()) - state.startedAt;

  return {
    dartsThrown,
    hits,
    accuracy,
    score: state.score,
    durationMs,
  };
}
