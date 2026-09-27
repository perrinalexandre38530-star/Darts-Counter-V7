import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "attila" as const;

/** Écran Play dédié à attila. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Maintiens la pression sur les cités, accumule la terreur et enchaîne les charges pour renverser l’empire." />;
}
