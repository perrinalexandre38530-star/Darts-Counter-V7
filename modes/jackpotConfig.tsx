import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "jackpot" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "basePot", label: "Pot de départ", type: "select", defaultValue: 250, options: [{ value: 100, label: "100 crédits" },{ value: 250, label: "250 · Standard" },{ value: 500, label: "500 crédits" }] },
  { key: "potGrowth", label: "Croissance du pot par tour", type: "select", defaultValue: 10, options: [{ value: 5, label: "+5" },{ value: 10, label: "+10 · Standard" },{ value: 20, label: "+20" }] },
  { key: "payoutMultiplierPct", label: "Multiplicateur des gains", type: "select", defaultValue: 100, options: [{ value: 75, label: "75%" },{ value: 100, label: "100% · Standard" },{ value: 150, label: "150%" }] },
];

const DEDICATED_INTRO = "Choisis la taille initiale du pot, sa croissance à chaque spin et le multiplicateur appliqué aux gains de la machine à sous.";

/** Configuration dédiée à JACKPOT. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
