import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "hi_score" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "fatBull", label: "Fat Bull", type: "toggle", defaultValue: false, help: "OFF : BULL 25 / DBULL 50. ON : les deux zones valent 50." },
  { key: "scoreMultiplierPct", label: "Multiplicateur global", type: "select", defaultValue: 100, options: [{ value: 100, label: "100% · Classique" },{ value: 110, label: "110% · Boost" },{ value: 125, label: "125% · Arcade" }] },
  { key: "missPenalty", label: "Pénalité MISS", type: "select", defaultValue: 0, options: [{ value: 0, label: "OFF · Classique" },{ value: 10, label: "−10" },{ value: 25, label: "−25" }] },
];

const DEDICATED_INTRO = "8 rounds par défaut : toutes les fléchettes scorent à leur valeur réelle et le plus gros total gagne. Les réglages ci-dessous sont des variantes optionnelles ; 100% + Fat Bull OFF + MISS OFF correspond au jeu classique.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
