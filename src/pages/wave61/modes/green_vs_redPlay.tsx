import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "green_vs_red" as const;

/** Écran Play dédié à green_vs_red. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Duel à 2 : vise DOUBLE et TRIPLE du numéro courant de ta couleur. Toucher le numéro adverse te retire sa valeur ; le meilleur total après le BULL gagne." />;
}
