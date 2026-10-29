import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "double_down" as const;

/** Écran Play dédié à double_down. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Départ classique à 40. Valide le contrat du round avec au moins une fléchette ; 0/3 divise ton score cumulé par deux." />;
}
