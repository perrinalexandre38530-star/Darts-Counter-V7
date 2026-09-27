import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "jurassic_dart" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "attackThreshold", label: "Seuil d’attaque des dinosaures", type: "select", defaultValue: 100, options: [{ value: 85, label: "85% · Nerveux" },{ value: 100, label: "100% · Standard" },{ value: 115, label: "115% · Plus calme" }] },
  { key: "tranquilizerPower", label: "Puissance du tranquillisant BULL", type: "select", defaultValue: 22, options: [{ value: 16, label: "16" },{ value: 22, label: "22 · Standard" },{ value: 30, label: "30" }] },
  { key: "securityDamage", label: "Dégâts lors d’une attaque", type: "select", defaultValue: 52, options: [{ value: 40, label: "40 · Accessible" },{ value: 52, label: "52 · Standard" },{ value: 68, label: "68 · Prédateur" }] },
];

const DEDICATED_INTRO = "Personnalise l’agressivité des dinosaures, la puissance des tranquillisant BULL et les dégâts subis lors d’une attaque.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
