import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";
export const WAVE61_MODE_ID = "black_vs_white" as const;
export default function DedicatedWave61Play(props:any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} forceGreenRedUi={true} dedicatedPlayHint="Joue les SIMPLES de ta piste NOIRE ou BLANCHE. Les D/T, le BULL, les erreurs et le bonus de volée parfaite suivent ta configuration." />;
}
