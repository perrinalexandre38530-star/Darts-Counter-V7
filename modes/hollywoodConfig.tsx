import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "hollywood" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "sceneNeed", label: "Prises requises par scène", type: "select", defaultValue: 3, options: [{ value: 2, label: "2 · Blockbuster rapide" },{ value: 3, label: "3 · Standard" },{ value: 4, label: "4 · Réalisateur exigeant" }] },
  { key: "starPowerPct", label: "Valeur des étoiles", type: "select", defaultValue: 100, options: [{ value: 80, label: "80%" },{ value: 100, label: "100% · Standard" },{ value: 130, label: "130%" }] },
  { key: "boxOfficePct", label: "Multiplicateur box-office", type: "select", defaultValue: 100, options: [{ value: 80, label: "80%" },{ value: 100, label: "100% · Standard" },{ value: 125, label: "125%" }] },
];

const DEDICATED_INTRO = "Ajuste le nombre de prises nécessaires, la valeur artistique des réussites et le rendement du box-office.";

/** Configuration dédiée à HOLLYWOOD. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
