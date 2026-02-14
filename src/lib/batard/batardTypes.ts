export type BatardWinMode = "SCORE_MAX" | "RACE_TO_FINISH";

export type BatardFailPolicy =
  | "NONE"
  | "MINUS_POINTS"
  | "BACK_ROUND"
  | "FREEZE";

export type BatardMultiplierRule =
  | "ANY"
  | "SINGLE"
  | "DOUBLE"
  | "TRIPLE";

export interface BatardRound {
  id: string;
  label: string;
  target?: number;
  multiplierRule: BatardMultiplierRule;
  bullOnly?: boolean;
}

export interface BatardConfig {
  winMode: BatardWinMode;
  failPolicy: BatardFailPolicy;
  failValue: number;
  rounds: BatardRound[];
}

export interface BatardPlayerState {
  id: string;
  score: number;
  roundIndex: number;
}
