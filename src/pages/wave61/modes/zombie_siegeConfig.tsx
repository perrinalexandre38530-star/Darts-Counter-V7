import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "zombie_siege" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "infectionPowerPct", label: "Puissance d’infection", type: "select", defaultValue: 100, options: [{ value: 80, label: "80% · Lent" },{ value: 100, label: "100% · Standard" },{ value: 125, label: "125% · Horde" }] },
  { key: "barricadePowerPct", label: "Puissance des barricades", type: "select", defaultValue: 100, options: [{ value: 80, label: "80%" },{ value: 100, label: "100% · Standard" },{ value: 125, label: "125%" }] },
  { key: "curePowerPct", label: "Puissance des BULL de soin", type: "select", defaultValue: 100, options: [{ value: 75, label: "75%" },{ value: 100, label: "100% · Standard" },{ value: 140, label: "140%" }] },
];

const DEDICATED_INTRO = "Équilibre la contamination zombie face aux barricades des survivants et à la capacité des BULLS à faire reculer l’infection.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
