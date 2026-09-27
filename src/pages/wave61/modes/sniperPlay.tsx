import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "sniper" as const;

/** Écran Play dédié à sniper. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Exécute les contrats dans l’ordre ; triples et DBULL peuvent rapporter un bonus HEADSHOT." />;
}
