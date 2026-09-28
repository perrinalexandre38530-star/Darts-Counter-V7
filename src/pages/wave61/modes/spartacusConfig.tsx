import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "spartacus" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "startingArmor", label: "Armure de départ", type: "select", defaultValue: 40, options: [{ value: 20, label: "20 · Légère" },{ value: 40, label: "40 · Standard" },{ value: 60, label: "60 · Lourde" }] },
  { key: "guardCap", label: "Garde maximale", type: "select", defaultValue: 60, options: [{ value: 40, label: "40" },{ value: 60, label: "60 · Standard" },{ value: 90, label: "90" }] },
  { key: "attackPowerPct", label: "Puissance des attaques", type: "select", defaultValue: 100, options: [{ value: 80, label: "80%" },{ value: 100, label: "100% · Standard" },{ value: 125, label: "125%" }] },
];

const DEDICATED_INTRO = "Règle la robustesse initiale des gladiateurs, leur capacité de garde et la violence des coups portés dans l’arène.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
