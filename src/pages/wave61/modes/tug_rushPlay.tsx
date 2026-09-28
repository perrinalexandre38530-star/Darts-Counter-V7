import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "tug_rush" as const;

/** Écran Play dédié à tug_rush. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Enchaîne les impacts sur la cible active, profite des BULLS et fais franchir à la corde l’extrémité du camp adverse." />;
}
