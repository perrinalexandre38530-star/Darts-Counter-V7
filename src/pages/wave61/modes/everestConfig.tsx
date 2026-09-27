import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "everest" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "weatherSeverity", label: "Sévérité de la météo", type: "select", defaultValue: 100, options: [{ value: 85, label: "85% · Ouverte" },{ value: 100, label: "100% · Standard" },{ value: 130, label: "130% · Mortelle" }] },
  { key: "oxygenReserve", label: "Réserve d’oxygène de départ", type: "select", defaultValue: 90, options: [{ value: 80, label: "80%" },{ value: 90, label: "90%" },{ value: 100, label: "100%" }] },
  { key: "climbPower", label: "Puissance d’ascension", type: "select", defaultValue: 100, options: [{ value: 85, label: "85% · Conservatrice" },{ value: 100, label: "100% · Standard" },{ value: 110, label: "110% · Offensive" }] },
];

const DEDICATED_INTRO = "Personnalise la fenêtre météo, la réserve d’oxygène initiale et l’agressivité de l’ascension vers le toit du monde.";

/** Configuration dédiée à EVEREST. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
