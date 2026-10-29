import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "double_down" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "startScore", label: "Score de départ", type: "select", defaultValue: 40, options: [{ value: 40, label: "40 · Classique" },{ value: 0, label: "0 · Variante" }] },
  { key: "missPenaltyPercent", label: "Sanction si 0 touche", type: "select", defaultValue: 50, options: [{ value: 50, label: "÷2 · Classique" },{ value: 25, label: "−25% · Clément" },{ value: 75, label: "−75% · Hardcore" }] },
  { key: "hitMultiplierPct", label: "Valeur des touches", type: "select", defaultValue: 100, options: [{ value: 100, label: "100% · Classique" },{ value: 125, label: "125% · Arcade" },{ value: 150, label: "150% · Boost" }] },
  { key: "perfectBonus", label: "Bonus 3/3", type: "select", defaultValue: 0, options: [{ value: 0, label: "OFF · Classique" },{ value: 50, label: "+50" },{ value: 100, label: "+100" }] },
];

const DEDICATED_INTRO = "9 contrats fixes : 15 · 16 · DOUBLE · 17 · 18 · TRIPLE · 19 · 20 · BULL. En règle classique on démarre à 40 et une volée totalement ratée divise le score cumulé par deux.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
