import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "demineur" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "mineCount", label: "Nombre de mines", type: "select", defaultValue: 5, options: [{ value: 3, label: "3 · Accessible" },{ value: 5, label: "5 · Standard" },{ value: 7, label: "7 · Expert" }] },
  { key: "scannerStrength", label: "Scanner BULL", type: "select", defaultValue: 1, options: [{ value: 0, label: "OFF" },{ value: 1, label: "Standard" },{ value: 2, label: "Renforcé" }] },
  { key: "mineDamage", label: "Dégâts d’une mine", type: "select", defaultValue: 35, options: [{ value: 25, label: "25 PV" },{ value: 35, label: "35 PV" },{ value: 50, label: "50 PV" }] },
];

const DEDICATED_INTRO = "Ajuste la densité du champ de mines, la puissance du scanner BULL et les dégâts d’une explosion.";

/** Configuration dédiée à DÉMINEUR. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
