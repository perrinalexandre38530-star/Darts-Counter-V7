import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "un_deux_trois_soleil" as const;

/** Écran Play dédié à 1, 2, 3 SOLEIL. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Avance pendant le vert, puis fige-toi au rouge : un mouvement pendant SOLEIL te fait reculer." />;
}
