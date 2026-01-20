// ============================================
// src/lib/scoreInput/types.ts
// Unification des méthodes de saisie (Keypad / Cible / Presets / Voice / AI…)
// Objectif: toutes les UI de saisie produisent le même payload.
// ============================================

export type ScoreInputMethod =
  | "keypad"
  | "dartboard"
  | "presets"
  | "voice"
  | "auto"
  | "ai";

export type ScoreInputSource = ScoreInputMethod | "external";

export type UIDartInput = {
  /** 0 = MISS, 1..20 = segments, 25 = BULL/DBULL (mult=2 => 50) */
  segment: number;
  /** 1 (S), 2 (D), 3 (T). Pour Bull/DBull: 1 ou 2 uniquement. */
  multiplier: 1 | 2 | 3;
};

export type ScoreVisitPayload = {
  darts: UIDartInput[]; // 0..3
  source: ScoreInputSource;
  /** Optionnel: confiance (vision / IA) */
  confidence?: number; // 0..1
  /** Optionnel: meta (texte voice, etc.) */
  meta?: Record<string, any>;
};

export const SCORE_INPUT_LS_KEY = "dc-score-input-method";
