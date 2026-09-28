import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "apocalypse" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "refugeGoal", label: "Solidité de refuge requise", type: "select", defaultValue: 100, options: [{ value: 80, label: "80 · Rapide" },{ value: 100, label: "100 · Standard" },{ value: 120, label: "120 · Forteresse" }] },
  { key: "disasterThreshold", label: "Seuil de catastrophe", type: "select", defaultValue: 85, options: [{ value: 70, label: "70% · Chaos" },{ value: 85, label: "85% · Standard" },{ value: 100, label: "100% · Tolérant" }] },
  { key: "medkitPowerPct", label: "Puissance des medkits BULL", type: "select", defaultValue: 100, options: [{ value: 75, label: "75%" },{ value: 100, label: "100% · Standard" },{ value: 140, label: "140%" }] },
];

const DEDICATED_INTRO = "Ajuste la solidité du refuge à atteindre, la sensibilité aux catastrophes et l’efficacité des medkits obtenus avec les BULLS.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
