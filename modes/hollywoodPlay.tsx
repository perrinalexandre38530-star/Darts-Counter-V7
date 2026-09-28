import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "hollywood" as const;

/** Écran Play dédié à HOLLYWOOD. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Tourne chaque scène, accumule les étoiles et fais grimper le box-office jusqu’à la cérémonie finale." />;
}
