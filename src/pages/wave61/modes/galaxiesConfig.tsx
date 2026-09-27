import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "galaxies" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "captureThreshold", label: "Résistance des systèmes", type: "select", defaultValue: 6, options: [{ value: 5, label: "5 · Expansion rapide" },{ value: 6, label: "6 · Standard" },{ value: 7, label: "7 · Empire stellaire" }] },
  { key: "territoryGoal", label: "Systèmes à coloniser", type: "select", defaultValue: 5, options: [{ value: 4, label: "4 systèmes" },{ value: 5, label: "5 systèmes" },{ value: 6, label: "6 systèmes" }] },
  { key: "resourceBoost", label: "Gain d’énergie", type: "select", defaultValue: 120, options: [{ value: 100, label: "100%" },{ value: 120, label: "120% · Standard" },{ value: 145, label: "145% · Hyperdrive" }] },
];

const DEDICATED_INTRO = "Règle la résistance des systèmes stellaires, l’objectif de colonisation et la vitesse de recharge de l’hyperdrive.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
