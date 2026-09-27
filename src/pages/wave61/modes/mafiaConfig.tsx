import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "mafia" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "nightDamage", label: "Dégâts d’une attaque de nuit", type: "select", defaultValue: 45, options: [{ value: 35, label: "35 · Discret" },{ value: 45, label: "45 · Standard" },{ value: 60, label: "60 · Brutal" }] },
  { key: "dayVoteMultiplier", label: "Poids des votes le jour", type: "select", defaultValue: 1, options: [{ value: 1, label: "×1 · Standard" },{ value: 2, label: "×2 · Influent" },{ value: 3, label: "×3 · Tribunal expéditif" }] },
  { key: "medicShield", label: "Puissance de la protection du médecin", type: "select", defaultValue: 1, options: [{ value: 1, label: "1 charge" },{ value: 2, label: "2 charges" },{ value: 3, label: "3 charges" }] },
];

const DEDICATED_INTRO = "Régle la violence des nuits, l’influence des votes en journée et la solidité de la protection du médecin.";

/** Configuration dédiée à MAFIA. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
