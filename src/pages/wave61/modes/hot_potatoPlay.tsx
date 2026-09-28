import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "hot_potato" as const;

export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Passe la patate avant la fin de la mèche : chaque réussite te redonne du temps, chaque échec rapproche l’explosion." />;
}
