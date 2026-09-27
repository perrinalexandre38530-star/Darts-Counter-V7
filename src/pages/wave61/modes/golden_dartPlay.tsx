import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "golden_dart" as const;

/** Écran Play dédié à golden_dart. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Chaque erreur révèle des indices supplémentaires sur la position de la cible dorée." />;
}
