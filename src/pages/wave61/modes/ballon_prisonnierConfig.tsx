import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "ballon_prisonnier" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "damagePowerPct", label: "Puissance des tirs", type: "select", defaultValue: 100, options: [{ value: 80, label: "80%" },{ value: 100, label: "100% · Standard" },{ value: 125, label: "125%" }] },
  { key: "shieldCap", label: "Bouclier maximal", type: "select", defaultValue: 60, options: [{ value: 40, label: "40" },{ value: 60, label: "60 · Standard" },{ value: 90, label: "90" }] },
  { key: "releaseHealth", label: "PV après libération par BULL", type: "select", defaultValue: 70, options: [{ value: 50, label: "50 PV" },{ value: 70, label: "70 PV · Standard" },{ value: 90, label: "90 PV" }] },
];

const DEDICATED_INTRO = "Dose la puissance des impacts, la capacité de protection et l’état dans lequel un prisonnier revient sur le terrain.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
