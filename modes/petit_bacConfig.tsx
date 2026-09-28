import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "petit_bac" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "directAdvance", label: "Catégories validées par réussite", type: "select", defaultValue: 1, options: [{ value: 1, label: "1 · Standard" },{ value: 2, label: "2 · Rapide" }] },
  { key: "bullAdvance", label: "Catégories validées par BULL joker", type: "select", defaultValue: 1, options: [{ value: 1, label: "1 · Standard" },{ value: 2, label: "2 · Super joker" },{ value: 3, label: "3 · Méga joker" }] },
  { key: "validationBonus", label: "Bonus de validation", type: "select", defaultValue: 25, options: [{ value: 10, label: "10 pts" },{ value: 25, label: "25 pts · Standard" },{ value: 50, label: "50 pts" }] },
];

const DEDICATED_INTRO = "Ajuste la vitesse de validation des catégories, la puissance des BULLS joker et le bonus de score accordé à chaque réponse validée.";

/** Configuration dédiée à LE PETIT BAC. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
