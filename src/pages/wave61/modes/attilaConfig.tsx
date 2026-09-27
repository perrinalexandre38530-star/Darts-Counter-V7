import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "attila" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "captureThreshold", label: "Résistance des cités", type: "select", defaultValue: 5, options: [{ value: 4, label: "4 · Déferlante" },{ value: 5, label: "5 · Standard" },{ value: 6, label: "6 · Fortifié" }] },
  { key: "territoryGoal", label: "Territoires à dominer", type: "select", defaultValue: 5, options: [{ value: 4, label: "4 territoires" },{ value: 5, label: "5 territoires" },{ value: 6, label: "6 territoires" }] },
  { key: "resourceBoost", label: "Gain de terreur", type: "select", defaultValue: 120, options: [{ value: 100, label: "100% · Sage" },{ value: 120, label: "120% · Standard" },{ value: 140, label: "140% · Dévastateur" }] },
];

const DEDICATED_INTRO = "Paramètre l’élan des Huns : résistance des zones, nombre de territoires à ravager et vitesse de montée de la terreur.";

/** Configuration dédiée à ATTILA. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
