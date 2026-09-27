import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "summit_14" as const;

/** Écran Play dédié à summit_14. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Valide chaque sommet l’un après l’autre, limite la fatigue et conserve assez d’oxygène pour enchaîner les 14 ascensions." />;
}
