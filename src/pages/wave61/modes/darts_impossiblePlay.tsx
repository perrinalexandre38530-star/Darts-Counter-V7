import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "darts_impossible" as const;

/** Écran Play dédié à DARTS IMPOSSIBLE. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Reste chirurgical sous pression, traverse les couloirs laser et enchaîne les contrats de précision sans te faire repérer." />;
}
