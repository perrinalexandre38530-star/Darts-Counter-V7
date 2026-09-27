import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "colin_maillard" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "sequenceLength", label: "Longueur de séquence", type: "select", defaultValue: 6, options: [{ value: 4, label: "4" },{ value: 6, label: "6 · Standard" },{ value: 8, label: "8 · Expert" }] },
  { key: "previewMs", label: "Durée de l’aperçu", type: "select", defaultValue: 2000, options: [{ value: 1000, label: "1 seconde" },{ value: 2000, label: "2 secondes" },{ value: 3000, label: "3 secondes" }] },
];

const DEDICATED_INTRO = "Règle la longueur de la séquence à mémoriser et la durée de son aperçu.";

/** Configuration dédiée à COLIN-MAILLARD. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
