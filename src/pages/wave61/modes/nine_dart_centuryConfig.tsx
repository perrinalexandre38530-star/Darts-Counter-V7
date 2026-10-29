import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "nine_dart_century" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "targetScore", label: "Objectif", type: "select", defaultValue: 100, options: [{ value: 100, label: "100 · Classique" }] },
];

const DEDICATED_INTRO = "3 rounds / 9 fléchettes. Le meilleur résultat est 100 exact. Sinon gagne le score le plus proche sans dépasser ; si tous les joueurs dépassent, le plus petit dépassement l’emporte.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
