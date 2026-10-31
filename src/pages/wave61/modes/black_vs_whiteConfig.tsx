import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "black_vs_white" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "dtRule", label: "Règle D/T", type: "select", defaultValue: "bonus", options: [{ value: "bonus", label: "BONUS · valeur réelle" },{ value: "neutral", label: "NEUTRE · valeur simple" },{ value: "penalty", label: "PÉNALITÉ" }] },
  { key: "bullBonus", label: "Bonus BULL", type: "select", defaultValue: 25, options: [{ value: 0, label: "0" },{ value: 10, label: "+10" },{ value: 25, label: "+25" },{ value: 50, label: "+50" }] },
  { key: "wrongColorPenalty", label: "Pénalité mauvaise couleur", type: "select", defaultValue: 5, options: [{ value: 0, label: "0" },{ value: 5, label: "−5" },{ value: 10, label: "−10" },{ value: 20, label: "−20" }] },
  { key: "missPenalty", label: "Pénalité MISS", type: "select", defaultValue: 5, options: [{ value: 0, label: "0" },{ value: 5, label: "−5" },{ value: 10, label: "−10" },{ value: 20, label: "−20" }] },
  { key: "dtPenalty", label: "Pénalité D/T", type: "select", defaultValue: 5, options: [{ value: 0, label: "0" },{ value: 5, label: "−5" },{ value: 10, label: "−10" },{ value: 20, label: "−20" }] },
];

const DEDICATED_INTRO = "Joue les SIMPLES de ta couleur. Les D/T et le BULL suivent les bonus/pénalités choisis.";

export default function DedicatedWave61Config(props: any) { return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />; }
