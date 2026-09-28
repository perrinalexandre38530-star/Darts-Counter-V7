import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "green_vs_red" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "finishSteps", label: "Longueur de la piste", type: "select", defaultValue: 10, options: [{ value: 6, label: "6 · Sprint" },{ value: 8, label: "8 · Medium" },{ value: 10, label: "10 · Complète" }] },
  { key: "tripleAdvance", label: "Avance d’un TRIPLE", type: "select", defaultValue: 2, options: [{ value: 1, label: "+1 étape" },{ value: 2, label: "+2 étapes" },{ value: 3, label: "+3 étapes" }] },
  { key: "wrongColorAdvance", label: "Bonus adverse sur mauvaise couleur", type: "select", defaultValue: 1, options: [{ value: 0, label: "OFF" },{ value: 1, label: "+1 étape" },{ value: 2, label: "+2 étapes" }] },
];

const DEDICATED_INTRO = "Choisis la longueur de la course, l’accélération des triples et la punition lorsqu’un joueur touche la couleur adverse.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
