import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "draco_spheres" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "energyThreshold", label: "Énergie requise pour l’orbe bonus", type: "select", defaultValue: 100, options: [{ value: 75, label: "75% · Dynamique" },{ value: 100, label: "100% · Standard" },{ value: 125, label: "125% · Maîtrise" }] },
  { key: "bullEnergy", label: "Énergie gagnée sur BULL", type: "select", defaultValue: 22, options: [{ value: 16, label: "16" },{ value: 22, label: "22" },{ value: 30, label: "30" }] },
  { key: "tripleEnergy", label: "Énergie gagnée sur TRIPLE", type: "select", defaultValue: 12, options: [{ value: 8, label: "8" },{ value: 12, label: "12" },{ value: 18, label: "18" }] },
];

const DEDICATED_INTRO = "Personnalise la jauge d’énergie qui invoque un orbe bonus et la quantité gagnée avec les bulls et les triples.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
