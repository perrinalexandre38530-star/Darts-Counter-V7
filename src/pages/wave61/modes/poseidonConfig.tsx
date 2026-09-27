import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "poseidon" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "captureThreshold", label: "Résistance des domaines marins", type: "select", defaultValue: 6, options: [{ value: 5, label: "5 · Marée rapide" },{ value: 6, label: "6 · Standard" },{ value: 7, label: "7 · Abysses" }] },
  { key: "territoryGoal", label: "Domaines à contrôler", type: "select", defaultValue: 4, options: [{ value: 3, label: "3 domaines" },{ value: 4, label: "4 domaines" },{ value: 5, label: "5 domaines" }] },
  { key: "resourceBoost", label: "Gain de marée", type: "select", defaultValue: 110, options: [{ value: 90, label: "90% · Calme" },{ value: 110, label: "110% · Standard" },{ value: 135, label: "135% · Tempête" }] },
];

const DEDICATED_INTRO = "Ajuste la résistance des domaines océaniques, le nombre de zones à dominer et la vitesse à laquelle la marée recharge le pouvoir du trident.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
