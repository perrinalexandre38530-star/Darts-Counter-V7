import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "codebreaker" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "codeLength", label: "Longueur du code", type: "select", defaultValue: 3, options: [{ value: 2, label: "2 valeurs" },{ value: 3, label: "3 valeurs" }] },
  { key: "allowRepeats", label: "Répétitions autorisées", type: "toggle", defaultValue: false },
];

const DEDICATED_INTRO = "Choisis la longueur du code et si une même valeur peut apparaître plusieurs fois dans la combinaison secrète.";

/** Configuration dédiée à CODEBREAKER. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
