import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "cheval_de_troie" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "alertGain", label: "Alerte gagnée par erreur", type: "select", defaultValue: 9, options: [{ value: 6, label: "6% · Discret" },{ value: 9, label: "9% · Standard" },{ value: 13, label: "13% · Sentinelles" }] },
  { key: "bullStealth", label: "Alerte retirée par BULL", type: "select", defaultValue: 18, options: [{ value: 12, label: "12%" },{ value: 18, label: "18%" },{ value: 26, label: "26%" }] },
  { key: "phaseNeedBonus", label: "Difficulté des phases", type: "select", defaultValue: 0, options: [{ value: -1, label: "-1 · Infiltration facile" },{ value: 0, label: "Standard" },{ value: 1, label: "+1 · Siège renforcé" }] },
];

const DEDICATED_INTRO = "Ajuste la vigilance des défenseurs, l’efficacité des bulls pour rester discret et la difficulté de chaque phase du siège.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
