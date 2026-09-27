import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "vikings" as const;

/** Écran Play dédié à vikings. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Fais monter la fureur, lance les raids et verrouille assez de territoires pour imposer ton clan." />;
}
