import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "jardinier" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "waterStart", label: "Réserve d’eau initiale", type: "select", defaultValue: 60, options: [{ value: 40, label: "40%" },{ value: 60, label: "60% · Standard" },{ value: 80, label: "80%" }] },
  { key: "waterDrain", label: "Perte d’eau par erreur", type: "select", defaultValue: 8, options: [{ value: 5, label: "5%" },{ value: 8, label: "8% · Standard" },{ value: 12, label: "12%" }] },
  { key: "harvestGoal", label: "Récoltes nécessaires", type: "select", defaultValue: 5, options: [{ value: 3, label: "3 récoltes" },{ value: 5, label: "5 · Standard" },{ value: 7, label: "7 récoltes" }] },
];

const DEDICATED_INTRO = "Choisis la réserve d’eau de départ, la sévérité des erreurs et le nombre de récoltes à obtenir pour remporter la partie.";

/** Configuration dédiée à LE JARDINIER. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
