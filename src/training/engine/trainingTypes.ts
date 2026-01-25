// ============================================
// TRAINING — Types communs
// ============================================

export type TrainingMode =
  | "EVOLUTION"
  | "DOUBLE"
  | "CHALLENGES"
  | "GHOST"
  | "PRECISION"
  | "REPEAT"
  | "SUPER_BULL"
  | "TIME_ATTACK";

export type TrainingTarget = {
  label: string;
  value: number | "BULL" | "DBULL";
  multiplier?: 1 | 2 | 3;
};

export type TrainingThrow = {
  target: TrainingTarget | null;
  hit: boolean;
  score: number;
  timestamp: number;
};

export type TrainingSessionConfig = {
  mode: TrainingMode;
  maxDarts?: number;
  timeLimitMs?: number;
  targets?: TrainingTarget[];
  strict?: boolean;
};

export type TrainingSessionState = {
  startedAt: number;
  endedAt?: number;
  darts: TrainingThrow[];
  score: number;
  success: boolean | null;
};

export type TrainingStats = {
  dartsThrown: number;
  hits: number;
  accuracy: number;
  score: number;
  durationMs: number;
};
