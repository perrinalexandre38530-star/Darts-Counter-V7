import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "colin_maillard" as const;

/** Écran Play dédié à colin_maillard. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Observe brièvement la séquence, masque-la puis reproduis-la de mémoire." />;
}
