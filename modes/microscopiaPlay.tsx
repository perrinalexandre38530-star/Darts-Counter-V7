import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "microscopia" as const;

/** Écran Play dédié à MICROSCOPIA. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Isole les échantillons avec précision, maximise leur qualité et garde la contamination sous contrôle grâce aux BULLS." />;
}
