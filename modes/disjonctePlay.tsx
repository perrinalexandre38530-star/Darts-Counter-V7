import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "disjoncte" as const;

/** Écran Play dédié à DISJONCTÉ. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Alimente les circuits sans atteindre la surcharge critique ; les BULLS refroidissent le tableau électrique." />;
}
