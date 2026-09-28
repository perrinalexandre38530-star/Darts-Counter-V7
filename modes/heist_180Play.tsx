import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "heist_180" as const;

/** Écran Play dédié à HEIST 180. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Passe les quatre phases du casse sans faire exploser la chaleur ; les BULLS sont tes meilleures fenêtres de discrétion." />;
}
