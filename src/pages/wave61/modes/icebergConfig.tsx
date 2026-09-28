import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "iceberg" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "compartmentGoal", label: "Compartiments à sécuriser", type: "select", defaultValue: 5, options: [{ value: 3, label: "3 · Court" },{ value: 5, label: "5 · Standard" },{ value: 7, label: "7 · Long" }] },
  { key: "floodPowerPct", label: "Vitesse d’inondation", type: "select", defaultValue: 100, options: [{ value: 75, label: "75%" },{ value: 100, label: "100% · Standard" },{ value: 130, label: "130%" }] },
  { key: "pumpPowerPct", label: "Puissance des pompes BULL", type: "select", defaultValue: 100, options: [{ value: 80, label: "80%" },{ value: 100, label: "100% · Standard" },{ value: 130, label: "130%" }] },
];

const DEDICATED_INTRO = "Choisis la durée de la mission, la rapidité avec laquelle l’eau envahit le navire et l’efficacité des pompes déclenchées au BULL.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
