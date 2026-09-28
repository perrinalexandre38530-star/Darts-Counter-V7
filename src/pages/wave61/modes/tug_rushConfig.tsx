import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "tug_rush" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "pullPowerPct", label: "Puissance de traction", type: "select", defaultValue: 100, options: [{ value: 85, label: "85% · Technique" },{ value: 100, label: "100% · Standard" },{ value: 120, label: "120% · Arcade" }] },
  { key: "slipPenalty", label: "Recul sur tour raté", type: "select", defaultValue: 0, options: [{ value: 0, label: "AUTO · selon difficulté" },{ value: 1, label: "1 · Léger" },{ value: 2, label: "2 · Standard" },{ value: 4, label: "4 · Brutal" }] },
  { key: "bullBoostPct", label: "Boost BULL", type: "select", defaultValue: 100, options: [{ value: 75, label: "75%" },{ value: 100, label: "100%" },{ value: 125, label: "125%" }] },
];

const DEDICATED_INTRO = "Règle la force des tractions, le recul lorsque la volée rate complètement la cible et la puissance spéciale des BULLS.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
