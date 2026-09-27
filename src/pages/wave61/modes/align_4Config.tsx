import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "align_4" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "connectLength", label: "Jetons à aligner", type: "select", defaultValue: 4, options: [{ value: 3, label: "3" },{ value: 4, label: "4 · Standard" },{ value: 5, label: "5" }] },
  { key: "bullColumn", label: "BULL envoie en colonne", type: "select", defaultValue: 7, options: [{ value: 4, label: "4 · Centre" },{ value: 7, label: "7 · Bord" }] },
];

const DEDICATED_INTRO = "Personnalise la longueur de l’alignement gagnant et la colonne déclenchée par un BULL.";

/** Configuration dédiée à ALIGN 4. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
