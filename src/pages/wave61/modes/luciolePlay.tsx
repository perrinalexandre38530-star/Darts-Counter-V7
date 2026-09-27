import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "luciole" as const;

/** Écran Play dédié à luciole. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Mémorise le secteur pendant l’éclair de lumière puis vise-le une fois la cible cachée." />;
}
