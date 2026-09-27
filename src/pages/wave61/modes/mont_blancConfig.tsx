import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "mont_blanc" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "weatherSeverity", label: "Sévérité de la météo", type: "select", defaultValue: 100, options: [{ value: 80, label: "80% · Clémente" },{ value: 100, label: "100% · Standard" },{ value: 125, label: "125% · Engagée" }] },
  { key: "oxygenReserve", label: "Réserve d’oxygène de départ", type: "select", defaultValue: 100, options: [{ value: 90, label: "90%" },{ value: 100, label: "100%" },{ value: 110, label: "110%" }] },
  { key: "climbPower", label: "Puissance de progression", type: "select", defaultValue: 100, options: [{ value: 90, label: "90% · Prudente" },{ value: 100, label: "100% · Standard" },{ value: 115, label: "115% · Rapide" }] },
];

const DEDICATED_INTRO = "Ajuste la violence de la météo, la réserve d’oxygène initiale et la vitesse de progression vers le sommet du Mont Blanc.";

/** Configuration dédiée à MONT BLANC. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
