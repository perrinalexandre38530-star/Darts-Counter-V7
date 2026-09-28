import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "final_buzzer" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "fixedCutoff", label: "Déclenchement du buzzer", type: "select", defaultValue: 0, options: [{ value: 0, label: "Aléatoire · Standard" },{ value: 1, label: "Après dart 1" },{ value: 2, label: "Après dart 2" },{ value: 3, label: "Après dart 3" }] },
  { key: "clutchBonus", label: "Bonus CLUTCH", type: "select", defaultValue: 25, options: [{ value: 15, label: "15 pts" },{ value: 25, label: "25 pts · Standard" },{ value: 40, label: "40 pts" }] },
  { key: "streakCap", label: "Plafond bonus de série", type: "select", defaultValue: 25, options: [{ value: 15, label: "15 pts" },{ value: 25, label: "25 pts · Standard" },{ value: 40, label: "40 pts" }] },
];

const DEDICATED_INTRO = "Choisis si le buzzer reste imprévisible ou fixe, puis ajuste la valeur des tirs CLUTCH et des séries.";

/** Configuration dédiée à FINAL BUZZER. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
