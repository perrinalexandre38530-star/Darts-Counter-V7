// @ts-nocheck
// =============================================================
// src/lib/batard/batardTypes.ts
// BATARD — types (configurable variants)
// =============================================================

export type BatardWinMode = "SCORE_MAX" | "RACE_TO_FINISH";

export type BatardFailPolicy =
  | "NONE"
  | "MINUS_POINTS"
  | "BACK_ROUND"
  | "FREEZE";

export type BatardMultiplierRule = "ANY" | "SINGLE" | "DOUBLE" | "TRIPLE";

export type BatardRoundType =
  | "TARGET_NUMBER"      // cible numéro précis (ex: 20)
  | "TARGET_BULL"        // bull (25/50)
  | "ANY_SCORE";         // score libre

export type BatardRound = {
  id: string;
  label: string;
  type: BatardRoundType;
  target?: number;                // utilisé si TARGET_NUMBER
  multiplierRule?: BatardMultiplierRule;
};

export type BatardConfig = {
  presetId: string;
  label: string;

  winMode: BatardWinMode;

  // échec = aucune flèche valide sur la volée
  failPolicy: BatardFailPolicy;
  failValue: number; // -points ou recul rounds

  // scoring
  scoreOnlyValid: boolean; // sinon tout score mais validation exige 1 hit valide
  minValidHitsToAdvance: number; // 1 par défaut

  rounds: BatardRound[];
};
