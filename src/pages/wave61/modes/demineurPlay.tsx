import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "demineur" as const;

/** Écran Play dédié à demineur. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Lis les chiffres voisins, exploite le scanner BULL et sécurise toutes les cases non minées." />;
}
