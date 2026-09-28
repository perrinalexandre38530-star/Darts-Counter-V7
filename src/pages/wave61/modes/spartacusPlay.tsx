import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "spartacus" as const;

export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Monte ta gloire, garde-toi avec les BULLS et frappe les adversaires jusqu’à être le dernier gladiateur debout." />;
}
