import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "le_loup" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "catchLives", label: "Vies perdues quand le loup attrape", type: "select", defaultValue: 1, options: [{ value: 1, label: "1 · Standard" },{ value: 2, label: "2 · Sauvage" }] },
  { key: "escapePowerPct", label: "Puissance de fuite", type: "select", defaultValue: 100, options: [{ value: 80, label: "80%" },{ value: 100, label: "100% · Standard" },{ value: 125, label: "125%" }] },
  { key: "bullProtectionCharges", label: "Charges de protection par BULL", type: "select", defaultValue: 1, options: [{ value: 1, label: "1 · Standard" },{ value: 2, label: "2" },{ value: 3, label: "3" }] },
];

const DEDICATED_INTRO = "Règle la dangerosité du loup, la vitesse de fuite des joueurs et le nombre d’attaques qu’un BULL peut bloquer.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
