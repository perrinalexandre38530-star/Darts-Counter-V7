import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "sabaudia_dauphine" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "captureThreshold", label: "Résistance des cols et forteresses", type: "select", defaultValue: 5, options: [{ value: 4, label: "4 · Escarmouche" },{ value: 5, label: "5 · Standard" },{ value: 6, label: "6 · Fortifié" }] },
  { key: "territoryGoal", label: "Territoires à contrôler", type: "select", defaultValue: 5, options: [{ value: 4, label: "4 territoires" },{ value: 5, label: "5 territoires" },{ value: 6, label: "6 territoires" }] },
  { key: "baseFort", label: "Fortification après conquête", type: "select", defaultValue: 2, options: [{ value: 1, label: "1 · Avant-poste" },{ value: 2, label: "2 · Fort alpin" },{ value: 3, label: "3 · Citadelle" }] },
];

const DEDICATED_INTRO = "Paramètre la résistance des vallées et cols, l’objectif territorial et le niveau de défense posé après chaque conquête.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
