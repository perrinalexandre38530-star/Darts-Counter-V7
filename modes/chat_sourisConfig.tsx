import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "chat_souris" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "mouseHeadStart", label: "Avance initiale de la souris", type: "select", defaultValue: 25, options: [{ value: 15, label: "15 · Petite avance" },{ value: 25, label: "25 · Standard" },{ value: 35, label: "35 · Grande avance" }] },
  { key: "movementPowerPct", label: "Puissance de déplacement", type: "select", defaultValue: 100, options: [{ value: 85, label: "85% · Tactique" },{ value: 100, label: "100% · Standard" },{ value: 120, label: "120% · Rapide" }] },
  { key: "bullShortcutPct", label: "Puissance des raccourcis BULL", type: "select", defaultValue: 100, options: [{ value: 80, label: "80%" },{ value: 100, label: "100% · Standard" },{ value: 130, label: "130% · Turbo" }] },
];

const DEDICATED_INTRO = "Ajuste l’avance donnée aux souris, la vitesse générale de poursuite et l’impact des raccourcis BULL.";

/** Configuration dédiée à CHAT & SOURIS. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
