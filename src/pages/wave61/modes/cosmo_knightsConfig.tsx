import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "cosmo_knights" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "burstThreshold", label: "Seuil du Cosmo Burst", type: "select", defaultValue: 100, options: [{ value: 80, label: "80% · Rapide" },{ value: 100, label: "100% · Standard" },{ value: 120, label: "120% · Légendaire" }] },
  { key: "burstDamage", label: "Puissance du Cosmo Burst", type: "select", defaultValue: 55, options: [{ value: 45, label: "45 · Contrôlé" },{ value: 55, label: "55 · Standard" },{ value: 70, label: "70 · Dévastateur" }] },
  { key: "shieldCap", label: "Bouclier cosmos maximum", type: "select", defaultValue: 50, options: [{ value: 35, label: "35" },{ value: 50, label: "50" },{ value: 65, label: "65" }] },
];

const DEDICATED_INTRO = "Règle la vitesse de charge du burst, sa puissance et la capacité maximale du bouclier cosmique.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
