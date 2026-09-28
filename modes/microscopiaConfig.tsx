import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "microscopia" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "contaminationGain", label: "Contamination par erreur", type: "select", defaultValue: 11, options: [{ value: 7, label: "7%" },{ value: 11, label: "11% · Standard" },{ value: 16, label: "16%" }] },
  { key: "bullDecontam", label: "Décontamination BULL", type: "select", defaultValue: 22, options: [{ value: 14, label: "14%" },{ value: 22, label: "22% · Standard" },{ value: 32, label: "32%" }] },
  { key: "qualityPowerPct", label: "Qualité des échantillons", type: "select", defaultValue: 100, options: [{ value: 80, label: "80%" },{ value: 100, label: "100% · Standard" },{ value: 130, label: "130%" }] },
];

const DEDICATED_INTRO = "Ajuste la vitesse de contamination, l’efficacité de la décontamination BULL et la qualité produite par chaque échantillon réussi.";

/** Configuration dédiée à MICROSCOPIA. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
