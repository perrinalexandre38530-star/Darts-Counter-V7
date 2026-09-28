import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "replicat" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "copyPoints", label: "Points par copie validée", type: "select", defaultValue: 100, options: [{ value: 50, label: "50 pts" },{ value: 100, label: "100 pts" },{ value: 150, label: "150 pts" }] },
  { key: "perfectBonus", label: "Bonus séquence parfaite", type: "select", defaultValue: 50, options: [{ value: 0, label: "OFF" },{ value: 50, label: "+50" },{ value: 100, label: "+100" }] },
  { key: "failurePenalty", label: "Pénalité copie imparfaite", type: "select", defaultValue: 0, options: [{ value: 0, label: "Aucune" },{ value: 1, label: "-1 réussite" },{ value: 2, label: "-2 réussites" }] },
];

const DEDICATED_INTRO = "Ajuste la valeur des reproductions, le bonus d’une volée copiée parfaitement et la pénalité appliquée aux copies imparfaites.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
