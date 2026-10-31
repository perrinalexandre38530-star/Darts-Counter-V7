import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "color_call" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "perfectBonus", label: "Bonus volée parfaite", type: "select", defaultValue: 10, options: [{ value: 0, label: "0" },{ value: 10, label: "+10" },{ value: 25, label: "+25" },{ value: 50, label: "+50" }] },
];

const DEDICATED_INTRO = "Une couleur est appelée à chaque tour : NOIR, BLANC, VERT ou ROUGE. Seuls les impacts de cette couleur marquent.";

export default function DedicatedWave61Config(props: any) { return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />; }
