import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "radin" as const;

/** Écran Play dédié à RADIN. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Gère tes ressources avec avarice, empoche le moindre point utile et fais payer aux autres chaque erreur de rythme ou de précision." />;
}
