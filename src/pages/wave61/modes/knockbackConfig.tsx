import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "knockback" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "collisionResetPct", label: "Score conservé après collision", type: "select", defaultValue: 0, options: [{ value: 0, label: "0% · Retour à zéro" },{ value: 25, label: "25%" },{ value: 50, label: "50%" }] },
  { key: "bustBack", label: "Recul après BUST", type: "select", defaultValue: 0, options: [{ value: 0, label: "OFF" },{ value: 10, label: "-10" },{ value: 25, label: "-25" }] },
  { key: "collisionScoreBonus", label: "Bonus de collision", type: "select", defaultValue: 0, options: [{ value: 0, label: "OFF" },{ value: 15, label: "+15 pts" },{ value: 30, label: "+30 pts" }] },
];

const DEDICATED_INTRO = "Règle la violence des collisions, le recul sur un BUST et le bonus attribué au joueur qui réussit un KNOCKBACK.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
