import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "athletisme" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "scoreMultiplierPct", label: "Coefficient général des épreuves", type: "select", defaultValue: 100, options: [{ value: 85, label: "85% · Serré" },{ value: 100, label: "100% · Standard" },{ value: 120, label: "120% · Spectacle" }] },
  { key: "sprintTripleBonus", label: "Bonus TRIPLE au sprint", type: "select", defaultValue: 5, options: [{ value: 0, label: "0" },{ value: 5, label: "5 · Standard" },{ value: 10, label: "10" }] },
  { key: "relayPerfectBonus", label: "Bonus relais parfait 20→19→18", type: "select", defaultValue: 30, options: [{ value: 15, label: "15" },{ value: 30, label: "30 · Standard" },{ value: 50, label: "50" }] },
];

const DEDICATED_INTRO = "Ajuste le barème global du meeting, la prime des triples au sprint et le bonus accordé à un relais parfait.";

/** Configuration dédiée à ATHLÉTISME. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
