// ============================================
// TRAINING — Session runtime
// ============================================

import {
    TrainingSessionConfig,
    TrainingSessionState,
    TrainingThrow,
    TrainingTarget,
  } from "./trainingTypes";
  
  export function createTrainingSession(
    config: TrainingSessionConfig
  ): TrainingSessionState {
    return {
      startedAt: Date.now(),
      darts: [],
      score: 0,
      success: null,
    };
  }
  
  export function registerThrow(
    state: TrainingSessionState,
    target: TrainingTarget | null,
    hit: boolean,
    score: number
  ) {
    const t: TrainingThrow = {
      target,
      hit,
      score,
      timestamp: Date.now(),
    };
  
    state.darts.push(t);
    state.score += score;
  }
  
  export function endTrainingSession(
    state: TrainingSessionState,
    success: boolean
  ) {
    state.endedAt = Date.now();
    state.success = success;
  }
  