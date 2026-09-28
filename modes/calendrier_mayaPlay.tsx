import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "calendrier_maya" as const;

/** Écran Play dédié à CALENDRIER MAYA. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Active les cinq sceaux avant que la fin du cycle n’atteigne 100 %, et utilise les BULLS pour repousser la catastrophe." />;
}
