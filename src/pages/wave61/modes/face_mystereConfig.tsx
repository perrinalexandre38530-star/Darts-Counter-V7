import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "face_mystere" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "cluesPerMiss", label: "Indices par erreur", type: "select", defaultValue: 1, options: [{ value: 1, label: "1 · Standard" },{ value: 2, label: "2 · Rapide" }] },
];

const DEDICATED_INTRO = "Règle la quantité d’indices révélés après une mauvaise accusation.";

/** Configuration dédiée à FACE MYSTÈRE. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
