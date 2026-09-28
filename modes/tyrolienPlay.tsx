import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "tyrolien" as const;

/** Écran Play dédié à LE TYROLIEN. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Garde de la vitesse, touche les secteurs des checkpoints et combats le vent jusqu’à l’autre rive." />;
}
