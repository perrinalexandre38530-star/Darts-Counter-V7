import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "align_4" as const;

/** Écran Play dédié à align_4. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Chaque impact choisit une colonne. Construis ton alignement avant l’adversaire." />;
}
