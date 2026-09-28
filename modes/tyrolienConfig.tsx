import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "tyrolien" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "startSpeed", label: "Vitesse de départ", type: "select", defaultValue: 20, options: [{ value: 10, label: "10% · Lent" },{ value: 20, label: "20% · Standard" },{ value: 30, label: "30% · Rapide" }] },
  { key: "boostPowerPct", label: "Puissance des boosts", type: "select", defaultValue: 100, options: [{ value: 80, label: "80%" },{ value: 100, label: "100% · Standard" },{ value: 125, label: "125%" }] },
  { key: "windPenalty", label: "Recul dans les zones de vent", type: "select", defaultValue: 4, options: [{ value: 2, label: "2 · Léger" },{ value: 4, label: "4 · Standard" },{ value: 7, label: "7 · Fort" }] },
];

const DEDICATED_INTRO = "Personnalise la vitesse initiale, la puissance des accélérations et le recul subi dans les zones de vent.";

/** Configuration dédiée à LE TYROLIEN. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
