import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "jurassic_dart" as const;

/** Écran Play dédié à jurassic_dart. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Progresse dans l’expédition sans laisser la menace atteindre son seuil d’attaque ; les bulls calment les prédateurs." />;
}
