import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "black_flag" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "captureThreshold", label: "Résistance des îles et forts", type: "select", defaultValue: 6, options: [{ value: 5, label: "5 · Rapide" },{ value: 6, label: "6 · Standard" },{ value: 7, label: "7 · Corsaire" }] },
  { key: "territoryGoal", label: "Zones à contrôler pour gagner", type: "select", defaultValue: 4, options: [{ value: 3, label: "3 zones" },{ value: 4, label: "4 zones" },{ value: 5, label: "5 zones" }] },
  { key: "resourceBoost", label: "Gain de butin", type: "select", defaultValue: 115, options: [{ value: 100, label: "100% · Sobre" },{ value: 115, label: "115% · Standard" },{ value: 130, label: "130% · Pillage" }] },
];

const DEDICATED_INTRO = "Dose la difficulté des prises de ports, le nombre de zones à piller et la cadence à laquelle le butin déclenche les bordées.";

/** Configuration dédiée à BLACK FLAG. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
