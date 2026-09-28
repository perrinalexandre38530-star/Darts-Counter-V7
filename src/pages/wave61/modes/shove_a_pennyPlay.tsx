import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "shove_a_penny" as const;

/** Écran Play dédié à shove_a_penny. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Ferme 15 à 20 puis BULL ; exploite les surplus selon la règle choisie pour gêner l’adversaire ou scorer." />;
}
