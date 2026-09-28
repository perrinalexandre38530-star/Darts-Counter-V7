import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "hot_potato" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "fuseLength", label: "Longueur de la mèche", type: "select", defaultValue: 5, options: [{ value: 3, label: "3 · Explosif" },{ value: 5, label: "5 · Standard" },{ value: 7, label: "7 · Détendu" }] },
  { key: "passFuseBonus", label: "Bonus de mèche après une passe", type: "select", defaultValue: 1, options: [{ value: 0, label: "+0" },{ value: 1, label: "+1 · Standard" },{ value: 2, label: "+2" }] },
  { key: "explosionDamage", label: "Dégâts d’une explosion", type: "select", defaultValue: 120, options: [{ value: 80, label: "80 PV" },{ value: 120, label: "120 PV · Standard" },{ value: 160, label: "160 PV" }] },
];

const DEDICATED_INTRO = "Choisis la durée de la mèche, le répit gagné après une passe réussie et la violence d’une explosion.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
