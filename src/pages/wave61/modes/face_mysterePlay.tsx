import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "face_mystere" as const;

/** Écran Play dédié à face_mystere. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Élimine les suspects avec les indices, puis vise le dernier portrait possible." />;
}
