import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";
export const WAVE61_MODE_ID = "black_vs_white" as const;
export default function DedicatedWave61Play(props:any) { return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Joue les SIMPLES de ta couleur. Les D/T et le BULL suivent les bonus/pénalités choisis." />; }
