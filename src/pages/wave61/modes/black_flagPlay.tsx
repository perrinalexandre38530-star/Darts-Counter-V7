import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "black_flag" as const;

/** Écran Play dédié à black_flag. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Pille les ports, profite des bulls pour remplir le butin et déclenche des bordées pour conquérir l’archipel." />;
}
