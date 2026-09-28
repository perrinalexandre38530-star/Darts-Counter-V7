import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "calendrier_maya" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "sealNeed", label: "Progression requise par sceau", type: "select", defaultValue: 3, options: [{ value: 2, label: "2 · Fluide" },{ value: 3, label: "3 · Standard" },{ value: 4, label: "4 · Rituel long" }] },
  { key: "doomGain", label: "Fin du cycle gagnée par erreur", type: "select", defaultValue: 10, options: [{ value: 7, label: "7%" },{ value: 10, label: "10% · Standard" },{ value: 14, label: "14%" }] },
  { key: "bullDoomRelief", label: "Réduction du cycle par BULL", type: "select", defaultValue: 20, options: [{ value: 12, label: "12%" },{ value: 20, label: "20% · Standard" },{ value: 30, label: "30%" }] },
];

const DEDICATED_INTRO = "Règle la difficulté des sceaux, la vitesse à laquelle la fin du cycle approche et la puissance salvatrice des BULLS.";

/** Configuration dédiée à CALENDRIER MAYA. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
