import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "roller_coaster" as const;

/** Écran Play dédié à ROLLER COASTER. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Construis ta vitesse sans dépasser la limite dans les loopings et virages, puis sprinte jusqu’à l’arrivée." />;
}
