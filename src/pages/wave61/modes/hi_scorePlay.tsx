import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "hi_score" as const;

/** Écran Play dédié à hi_score. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Accumule le maximum pendant le nombre de rounds choisi ; BULLS et MISS peuvent maintenant modifier le rendement." />;
}
