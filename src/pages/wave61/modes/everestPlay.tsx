import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "everest" as const;

/** Écran Play dédié à everest. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Progresse camp après camp, gère l’acclimatation et exploite chaque bull pour survivre dans la zone de la mort." />;
}
