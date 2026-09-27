import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "mont_blanc" as const;

/** Écran Play dédié à mont_blanc. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Vise la bonne fenêtre météo, monte régulièrement et surveille fatigue et oxygène jusqu’au sommet." />;
}
