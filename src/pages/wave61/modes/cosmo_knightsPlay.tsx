import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "cosmo_knights" as const;

/** Écran Play dédié à cosmo_knights. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Charge ton cosmos, protège ton chevalier et réserve ton Cosmo Burst pour briser le bouclier adverse." />;
}
