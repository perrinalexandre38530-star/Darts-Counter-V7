// ============================================
// src/training/engine/trainingStats.ts
// Stats Training minimal
// ============================================

import type { TrainingState } from "./trainingEngine";

export type TrainingStats = {
  darts: number;
  hits: number;
  hitRate: number;
  score: number;
  ppm: number; // points per minute
};

export function computeTrainingStats(state: TrainingState): TrainingStats {
  const darts = state.darts || 0;
  const hits = state.hits || 0;
  const hitRate = darts > 0 ? hits / darts : 0;

  const end = state.endedAt ?? Date.now();
  const ms = Math.max(1, end - state.startedAt);
  const minutes = ms / 60000;

  const score = state.score || 0;
  const ppm = minutes > 0 ? score / minutes : 0;

  return { darts, hits, hitRate, score, ppm };
}
