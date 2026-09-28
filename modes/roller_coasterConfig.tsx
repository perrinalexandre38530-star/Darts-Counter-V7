import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "roller_coaster" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "dangerLimit", label: "Vitesse maximale dans les zones dangereuses", type: "select", defaultValue: 72, options: [{ value: 60, label: "60% · Technique" },{ value: 72, label: "72% · Standard" },{ value: 85, label: "85% · Tolérant" }] },
  { key: "missSpeedLoss", label: "Perte de vitesse sur MISS", type: "select", defaultValue: 10, options: [{ value: 5, label: "5%" },{ value: 10, label: "10% · Standard" },{ value: 15, label: "15%" }] },
  { key: "bullBoostPct", label: "Boost BULL", type: "select", defaultValue: 100, options: [{ value: 80, label: "80%" },{ value: 100, label: "100% · Standard" },{ value: 130, label: "130% · Nitro" }] },
];

const DEDICATED_INTRO = "Règle la vitesse limite des loopings/virages, la perte de vitesse sur erreur et la puissance du boost BULL.";

/** Configuration dédiée à ROLLER COASTER. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
