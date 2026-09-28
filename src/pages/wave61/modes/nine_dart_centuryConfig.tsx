import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "nine_dart_century" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "bustBack", label: "Recul après BUST", type: "select", defaultValue: 0, options: [{ value: 0, label: "0 · Score conservé" },{ value: 10, label: "-10 points" },{ value: 20, label: "-20 points" }] },
  { key: "bustResetAfter", label: "BUSTS avant remise à zéro", type: "select", defaultValue: 0, options: [{ value: 0, label: "OFF" },{ value: 2, label: "2 BUSTS" },{ value: 3, label: "3 BUSTS" }] },
];

const DEDICATED_INTRO = "Le principe reste 100 exact en 9 fléchettes, avec des variantes optionnelles de recul ou de remise à zéro après plusieurs BUSTS.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
