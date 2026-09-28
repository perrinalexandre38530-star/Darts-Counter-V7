import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "shove_a_penny" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "marksPerBox", label: "Marques pour fermer une case", type: "select", defaultValue: 3, options: [{ value: 2, label: "2 · Rapide" },{ value: 3, label: "3 · Classique" },{ value: 4, label: "4 · Long" }] },
  { key: "overflowRule", label: "Gestion des surplus", type: "select", defaultValue: 1, options: [{ value: 0, label: "Perdus" },{ value: 1, label: "Poussés à l’adversaire" },{ value: 2, label: "Convertis en bonus" }] },
  { key: "overflowBonus", label: "Bonus par surplus", type: "select", defaultValue: 25, options: [{ value: 10, label: "+10" },{ value: 25, label: "+25" },{ value: 50, label: "+50" }] },
];

const DEDICATED_INTRO = "Définis combien de marques ferment chaque case et ce que deviennent les surplus : perdus, poussés ou transformés en points.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
