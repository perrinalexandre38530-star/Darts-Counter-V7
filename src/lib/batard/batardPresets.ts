// @ts-nocheck
// =============================================================
// src/lib/batard/batardPresets.ts
// BATARD — presets (Classic / Progressif / Punition)
// =============================================================
import type { BatardConfig } from "./batardTypes";

// ✅ Individual named exports (for existing imports)
export const classicPreset: BatardConfig = {
  presetId: "classic_bar",
  label: "Classic (Bar)",
  winMode: "SCORE_MAX",
  failPolicy: "NONE",
  failValue: 0,
  scoreOnlyValid: true,
  minValidHitsToAdvance: 1,
  rounds: [
    { id: "r1", label: "Simple 20", type: "TARGET_NUMBER", target: 20, multiplierRule: "SINGLE" },
    { id: "r2", label: "Double 20", type: "TARGET_NUMBER", target: 20, multiplierRule: "DOUBLE" },
    { id: "r3", label: "Triple 20", type: "TARGET_NUMBER", target: 20, multiplierRule: "TRIPLE" },
    { id: "r4", label: "19 (any)", type: "TARGET_NUMBER", target: 19, multiplierRule: "ANY" },
    { id: "r5", label: "18 (any)", type: "TARGET_NUMBER", target: 18, multiplierRule: "ANY" },
    { id: "r6", label: "Double (any)", type: "ANY_SCORE", multiplierRule: "DOUBLE" },
    { id: "r7", label: "Triple (any)", type: "ANY_SCORE", multiplierRule: "TRIPLE" },
    { id: "r8", label: "Bull", type: "TARGET_BULL", multiplierRule: "ANY" },
    { id: "r9", label: "Score Max", type: "ANY_SCORE", multiplierRule: "ANY" },
  ],
};

export const progressifPreset: BatardConfig = {
  presetId: "progressif_1_20_bull",
  label: "Progressif (1→20→Bull)",
  winMode: "RACE_TO_FINISH",
  failPolicy: "FREEZE",
  failValue: 0,
  scoreOnlyValid: true,
  minValidHitsToAdvance: 1,
  rounds: [
    ...Array.from({ length: 20 }, (_, i) => ({
      id: `n${i + 1}`,
      label: `Hit ${i + 1}`,
      type: "TARGET_NUMBER",
      target: i + 1,
      multiplierRule: "ANY",
    })),
    { id: "bull", label: "Bull", type: "TARGET_BULL", multiplierRule: "ANY" },
  ],
};

export const punitionPreset: BatardConfig = {
  presetId: "punition_mix",
  label: "Punition (Hard)",
  winMode: "SCORE_MAX",
  failPolicy: "MINUS_POINTS",
  failValue: 10,
  scoreOnlyValid: true,
  minValidHitsToAdvance: 1,
  rounds: [
    { id: "p1", label: "Double 16", type: "TARGET_NUMBER", target: 16, multiplierRule: "DOUBLE" },
    { id: "p2", label: "Triple 17", type: "TARGET_NUMBER", target: 17, multiplierRule: "TRIPLE" },
    { id: "p3", label: "Bull (DB ok)", type: "TARGET_BULL", multiplierRule: "ANY" },
    { id: "p4", label: "Score Max", type: "ANY_SCORE", multiplierRule: "ANY" },
  ],
};

// ✅ Keep existing array export for list UI
export const BATARD_PRESETS: BatardConfig[] = [
  classicPreset,
  progressifPreset,
  punitionPreset,
];

export function getBatardPreset(presetId: string): BatardConfig {
  return BATARD_PRESETS.find((p) => p.presetId === presetId) || classicPreset;
}
