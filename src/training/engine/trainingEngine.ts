// ============================================
// src/training/engine/trainingEngine.ts
// Engine Training minimal (stateless UI-friendly)
// ============================================

export type TrainingMode =
  | "TIME_ATTACK"
  | "DOUBLE"
  | "PRECISION"
  | "SUPER_BULL"
  | "GHOST"
  | "REPEAT"
  | "CHALLENGES"
  | "EVOLUTION";

export type TrainingEngineOptions = {
  mode: TrainingMode;
  timeLimitMs?: number;
  maxDarts?: number;
};

export type TrainingThrow = {
  value?: number | "BULL" | "DBULL";
  multiplier?: 1 | 2 | 3;
};

export type TrainingState = {
  mode: TrainingMode;
  startedAt: number;
  endedAt: number | null;
  finished: boolean;
  success: boolean | null;

  darts: number;
  hits: number;
  score: number;
};

export class TrainingEngine {
  state: TrainingState;

  constructor(opts: TrainingEngineOptions) {
    this.state = {
      mode: opts.mode,
      startedAt: Date.now(),
      endedAt: null,
      finished: false,
      success: null,
      darts: 0,
      hits: 0,
      score: 0,
    };
  }

  throw(t: TrainingThrow | null, hit: boolean, score: number) {
    if (this.state.finished) return;

    this.state.darts += 1;
    if (hit) this.state.hits += 1;
    this.state.score += Math.max(0, score || 0);
  }

  finish(success: boolean) {
    if (this.state.finished) return;
    this.state.finished = true;
    this.state.success = success;
    this.state.endedAt = Date.now();
  }
}
