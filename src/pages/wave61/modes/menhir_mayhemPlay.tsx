import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "menhir_mayhem" as const;

/** Écran Play dédié à menhir_mayhem. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Empile la pression sur les camps ennemis, dresse des défenses de menhirs et sécurise assez de zones pour gagner." />;
}
