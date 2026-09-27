import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "sabaudia_dauphine" as const;

/** Écran Play dédié à sabaudia_dauphine. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Prends les cols et forteresses, renforce chaque territoire conquis et fais basculer la carte alpine." />;
}
