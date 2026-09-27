import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "menhir_mayhem" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "captureThreshold", label: "Force requise pour renverser une zone", type: "select", defaultValue: 5, options: [{ value: 4, label: "4 · Rapide" },{ value: 5, label: "5 · Standard" },{ value: 6, label: "6 · Robuste" }] },
  { key: "territoryGoal", label: "Zones à sécuriser", type: "select", defaultValue: 4, options: [{ value: 3, label: "3 zones" },{ value: 4, label: "4 zones" },{ value: 5, label: "5 zones" }] },
  { key: "baseFort", label: "Fortification de base après capture", type: "select", defaultValue: 1, options: [{ value: 0, label: "0 · Exposé" },{ value: 1, label: "1 · Standard" },{ value: 2, label: "2 · Menhirs dressés" }] },
];

const DEDICATED_INTRO = "Règle la résistance des camps, l’objectif de contrôle et l’épaisseur des défenses de menhirs après chaque conquête.";

/** Configuration dédiée à MENHIR MAYHEM. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
