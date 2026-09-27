import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "sniper" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "headshotBonus", label: "Bonus HEADSHOT", type: "select", defaultValue: 175, options: [{ value: 175, label: "175 pts · Standard" },{ value: 250, label: "250 pts" },{ value: 350, label: "350 pts · Arcade" }] },
];

const DEDICATED_INTRO = "Règle la valeur du bonus HEADSHOT accordé aux triples et aux DBULL réussis.";

/** Configuration dédiée à SNIPER. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
