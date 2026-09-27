import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "poseidon" as const;

/** Écran Play dédié à poseidon. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Conquiers les domaines marins, fais monter la marée et déclenche le trident au moment où la défense adverse cède." />;
}
