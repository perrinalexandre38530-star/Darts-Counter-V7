import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "summit_14" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "weatherSeverity", label: "Sévérité de la météo", type: "select", defaultValue: 100, options: [{ value: 85, label: "85% · Favorable" },{ value: 100, label: "100% · Standard" },{ value: 125, label: "125% · Impitoyable" }] },
  { key: "oxygenReserve", label: "Réserve d’oxygène de départ", type: "select", defaultValue: 90, options: [{ value: 80, label: "80%" },{ value: 90, label: "90%" },{ value: 100, label: "100%" }] },
  { key: "peakThreshold", label: "Progression requise par sommet", type: "select", defaultValue: 5, options: [{ value: 4, label: "4 · Accessible" },{ value: 5, label: "5 · Standard" },{ value: 6, label: "6 · Extrême" }] },
];

const DEDICATED_INTRO = "Définis le climat global de la campagne des 14 sommets, la réserve d’oxygène initiale et la difficulté de validation de chaque sommet.";

/** Configuration dédiée à SUMMIT 14. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
