import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "eperviers" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "catchThreshold", label: "Touches avant conversion en Épervier", type: "select", defaultValue: 2, options: [{ value: 1, label: "1 · Impitoyable" },{ value: 2, label: "2 · Standard" },{ value: 3, label: "3 · Tolérant" }] },
  { key: "crossingGoal", label: "Distance de traversée", type: "select", defaultValue: 100, options: [{ value: 80, label: "80 · Courte" },{ value: 100, label: "100 · Standard" },{ value: 120, label: "120 · Longue" }] },
  { key: "runPowerPct", label: "Puissance de course", type: "select", defaultValue: 100, options: [{ value: 85, label: "85%" },{ value: 100, label: "100% · Standard" },{ value: 120, label: "120%" }] },
];

const DEDICATED_INTRO = "Ajuste le nombre de touches nécessaires pour capturer un coureur, la longueur de la traversée et la vitesse de progression.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
