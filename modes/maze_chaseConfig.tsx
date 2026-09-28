import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "maze_chase" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "ghostGap", label: "Écart initial du poursuivant", type: "select", defaultValue: 6, options: [{ value: 4, label: "4 cases · Pression forte" },{ value: 6, label: "6 cases · Standard" },{ value: 8, label: "8 cases · Confort" }] },
  { key: "ghostAdvance", label: "Vitesse du poursuivant", type: "select", defaultValue: 1, options: [{ value: 1, label: "1 · Standard" },{ value: 2, label: "2 · Rapide" },{ value: 3, label: "3 · Furieux" }] },
  { key: "bullPowerCharge", label: "Charges POWER gagnées par BULL", type: "select", defaultValue: 1, options: [{ value: 1, label: "1 charge" },{ value: 2, label: "2 charges" },{ value: 3, label: "3 charges" }] },
];

const DEDICATED_INTRO = "Paramètre la distance initiale du fantôme, sa vitesse de chasse et la quantité de POWER gagnée grâce aux BULLS.";

/** Configuration dédiée à MAZE CHASE. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
