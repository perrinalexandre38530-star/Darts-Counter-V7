import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "objectif_lune" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "fuelGainPct", label: "Production de carburant", type: "select", defaultValue: 100, options: [{ value: 80, label: "80%" },{ value: 100, label: "100% · Standard" },{ value: 125, label: "125%" }] },
  { key: "stabilityLoss", label: "Perte de stabilité par erreur", type: "select", defaultValue: 8, options: [{ value: 5, label: "5% · Stable" },{ value: 8, label: "8% · Standard" },{ value: 12, label: "12% · Instable" }] },
  { key: "fuelMinimum", label: "Carburant minimum au lancement", type: "select", defaultValue: 35, options: [{ value: 25, label: "25%" },{ value: 35, label: "35% · Standard" },{ value: 50, label: "50%" }] },
];

const DEDICATED_INTRO = "Personnalise la production de carburant, la fragilité de la trajectoire et la réserve minimale requise avant le lancement.";

/** Configuration dédiée à OBJECTIF LUNE. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
