import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "replicat" as const;

/** Écran Play dédié à replicat. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Observe la volée de référence puis reproduis-la selon le niveau choisi ; les séquences parfaites font la différence." />;
}
