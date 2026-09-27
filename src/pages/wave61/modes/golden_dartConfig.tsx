import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "golden_dart" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "cluesPerMiss", label: "Indices par erreur", type: "select", defaultValue: 1, options: [{ value: 1, label: "1 · Standard" },{ value: 2, label: "2 · Rapide" },{ value: 3, label: "3 · Assistance" }] },
];

const DEDICATED_INTRO = "Choisis le nombre d’indices révélés après chaque tentative incorrecte.";

/** Configuration dédiée à GOLDEN DART. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
