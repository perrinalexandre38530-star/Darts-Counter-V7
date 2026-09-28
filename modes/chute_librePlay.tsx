import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "chute_libre" as const;

/** Écran Play dédié à CHUTE LIBRE. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Contrôle ta descente et ouvre le parachute au bon moment : trop tôt tu perds du temps, trop tard tu risques le crash." />;
}
