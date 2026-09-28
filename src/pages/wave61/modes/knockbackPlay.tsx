import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "knockback" as const;

/** Écran Play dédié à knockback. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Atteins l’objectif exact et cherche les collisions de score pour repousser les adversaires sans te mettre toi-même en BUST." />;
}
