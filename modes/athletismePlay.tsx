import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "athletisme" as const;

/** Écran Play dédié à ATHLÉTISME. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Six épreuves, six barèmes : adapte ton lancer au sprint, aux haies, aux sauts, au javelot puis au relais." />;
}
