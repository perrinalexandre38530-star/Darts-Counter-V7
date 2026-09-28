import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "saut_a_la_corde" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "missJumpPenalty", label: "Sauts perdus sur une faute", type: "select", defaultValue: 0, options: [{ value: 0, label: "0 · Combo seulement" },{ value: 2, label: "2 sauts" },{ value: 4, label: "4 sauts" }] },
  { key: "paceStep", label: "Combo nécessaire pour accélérer le rythme", type: "select", defaultValue: 10, options: [{ value: 6, label: "6 · Rapide" },{ value: 10, label: "10 · Standard" },{ value: 15, label: "15 · Progressif" }] },
  { key: "bullJumpBonusPct", label: "Bonus de sauts BULL", type: "select", defaultValue: 100, options: [{ value: 80, label: "80%" },{ value: 100, label: "100% · Standard" },{ value: 130, label: "130%" }] },
];

const DEDICATED_INTRO = "Règle la sanction en cas de faute, la vitesse de montée du rythme et le bonus accordé aux BULLS.";

/** Configuration dédiée à SAUT À LA CORDE. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
