import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "hi_score" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "scoreMultiplierPct", label: "Multiplicateur global", type: "select", defaultValue: 100, options: [{ value: 100, label: "100% · Pur" },{ value: 110, label: "110% · Boost" },{ value: 125, label: "125% · Arcade" }] },
  { key: "bullBonus", label: "Bonus par BULL", type: "select", defaultValue: 0, options: [{ value: 0, label: "OFF" },{ value: 25, label: "+25" },{ value: 50, label: "+50" }] },
  { key: "missPenalty", label: "Pénalité par MISS", type: "select", defaultValue: 0, options: [{ value: 0, label: "OFF" },{ value: 10, label: "-10" },{ value: 25, label: "-25" }] },
];

const DEDICATED_INTRO = "Le High Score reste basé sur le total brut, avec en option un boost global, des BULLS bonifiés ou une pénalité sur les MISS.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
