import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "double_down" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "missPenaltyPercent", label: "Perte si contrat raté", type: "select", defaultValue: 50, options: [{ value: 25, label: "25% · Clément" },{ value: 50, label: "50% · Classique" },{ value: 75, label: "75% · Impitoyable" }] },
  { key: "hitMultiplierPct", label: "Valeur des touches", type: "select", defaultValue: 100, options: [{ value: 100, label: "100%" },{ value: 125, label: "125%" },{ value: 150, label: "150%" }] },
  { key: "perfectBonus", label: "Bonus contrat parfait", type: "select", defaultValue: 0, options: [{ value: 0, label: "OFF" },{ value: 50, label: "+50" },{ value: 100, label: "+100" }] },
];

const DEDICATED_INTRO = "Personnalise la sanction d’un round totalement raté, la valeur des bonnes touches et le bonus d’une volée parfaite.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
