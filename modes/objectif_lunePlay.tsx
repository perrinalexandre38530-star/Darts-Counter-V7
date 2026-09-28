import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "objectif_lune" as const;

/** Écran Play dédié à OBJECTIF LUNE. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Construis le carburant, stabilise la trajectoire et franchis lancement, orbite puis alunissage sans perdre une phase." />;
}
