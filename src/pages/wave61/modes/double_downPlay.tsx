import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "double_down" as const;

/** Écran Play dédié à double_down. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Chaque round impose un contrat : marque dessus ou accepte la sanction configurée si toute la volée passe à côté." />;
}
