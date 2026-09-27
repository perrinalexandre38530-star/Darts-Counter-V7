import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "vikings" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "captureThreshold", label: "Pression nécessaire pour conquérir", type: "select", defaultValue: 5, options: [{ value: 4, label: "4 · Raid éclair" },{ value: 5, label: "5 · Standard" },{ value: 6, label: "6 · Forteresses" }] },
  { key: "territoryGoal", label: "Territoires pour gagner", type: "select", defaultValue: 4, options: [{ value: 3, label: "3 zones" },{ value: 4, label: "4 zones" },{ value: 5, label: "5 zones" }] },
  { key: "resourceBoost", label: "Gain de fureur", type: "select", defaultValue: 100, options: [{ value: 85, label: "85% · Lent" },{ value: 100, label: "100% · Standard" },{ value: 120, label: "120% · Berserk" }] },
];

const DEDICATED_INTRO = "Ajuste la résistance des territoires vikings, l’objectif de domination et la vitesse à laquelle la fureur remplit la jauge de raid.";

/** Configuration dédiée à VIKINGS. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
