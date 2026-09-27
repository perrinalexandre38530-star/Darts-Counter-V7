import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "pyramides" as const;

/** Écran Play dédié à pyramides. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Avance salle par salle, protège la torche avec les bulls et évite les retours en arrière provoqués par les erreurs." />;
}
