import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "final_buzzer" as const;

/** Écran Play dédié à FINAL BUZZER. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Chaque défi peut être interrompu par le buzzer : marque avant la coupure et cherche le CLUTCH sur le dernier dart autorisé." />;
}
