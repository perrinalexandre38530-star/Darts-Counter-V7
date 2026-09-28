import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "heist_180" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "phaseNeed", label: "Progression requise par phase", type: "select", defaultValue: 3, options: [{ value: 2, label: "2 · Rapide" },{ value: 3, label: "3 · Standard" },{ value: 4, label: "4 · Expert" }] },
  { key: "heatGain", label: "Chaleur gagnée par erreur", type: "select", defaultValue: 8, options: [{ value: 5, label: "5% · Discret" },{ value: 8, label: "8% · Standard" },{ value: 12, label: "12% · Bruyant" }] },
  { key: "bullCooling", label: "Refroidissement grâce au BULL", type: "select", defaultValue: 18, options: [{ value: 10, label: "10%" },{ value: 18, label: "18% · Standard" },{ value: 28, label: "28% · Furtif" }] },
];

const DEDICATED_INTRO = "Ajuste la difficulté des quatre phases du casse, la montée de l’alarme et la capacité des BULLS à faire retomber la pression.";

/** Configuration dédiée à HEIST 180. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
