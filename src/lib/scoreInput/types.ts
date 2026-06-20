// ============================================
// src/lib/scoreInput/types.ts
// Unification des méthodes de saisie X01.
// Méthodes conservées côté produit : Keypad détail / Keypad score de volée / Cible / Presets / Voice.
// AUTO et IA ont été supprimés volontairement : valeurs héritées => keypad.
// ============================================

export type ScoreInputMethod =
  | "keypad"
  | "visit_score"
  | "dartboard"
  | "presets"
  | "voice";

export type ScoreInputSource = ScoreInputMethod | "external" | "external-video";

export type UIDartInput = {
  /** 0 = MISS, 1..20 = segments, 25 = BULL/DBULL (mult=2 => 50) */
  segment: number;
  /** 1 (S), 2 (D), 3 (T). Pour Bull/DBull: 1 ou 2 uniquement. */
  multiplier: 1 | 2 | 3;
};

export type ScoreVisitPayload = {
  darts: UIDartInput[]; // 0..3
  source: ScoreInputSource;
  /** Optionnel: confiance (vision / bridge externe) */
  confidence?: number; // 0..1
  /** Optionnel: meta (texte voice, provider externe, etc.) */
  meta?: Record<string, any>;
};

export const SCORE_INPUT_LS_KEY = "dc-score-input-method";

export function sanitizeScoreInputMethod(value: unknown): ScoreInputMethod {
  if (value === "keypad" || value === "visit_score" || value === "dartboard" || value === "presets" || value === "voice") {
    return value;
  }
  // Compat anciennes configs : auto / ai / camera-ai / tout inconnu => keypad.
  return "keypad";
}
