import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "apocalypse" as const;

export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Renforce ton refuge, accumule des ressources et fais retomber la menace avant que les catastrophes ne détruisent ta survie." />;
}
