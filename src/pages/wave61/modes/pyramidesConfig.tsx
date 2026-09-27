import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "pyramides" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "torchStart", label: "Niveau initial de la torche", type: "select", defaultValue: 70, options: [{ value: 55, label: "55% · Tamisé" },{ value: 70, label: "70% · Standard" },{ value: 85, label: "85% · Lumineux" }] },
  { key: "torchDrain", label: "Perte de torche par erreur", type: "select", defaultValue: 9, options: [{ value: 6, label: "6% · Doux" },{ value: 9, label: "9% · Standard" },{ value: 12, label: "12% · Pièges actifs" }] },
  { key: "chamberNeed", label: "Progression requise par salle", type: "select", defaultValue: 3, options: [{ value: 2, label: "2 · Explorateur" },{ value: 3, label: "3 · Standard" },{ value: 4, label: "4 · Archéologue" }] },
];

const DEDICATED_INTRO = "Choisis la puissance de départ de la torche, la sévérité des erreurs et la quantité de progression requise pour traverser chaque chambre.";

/** Configuration dédiée à PYRAMIDES. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
