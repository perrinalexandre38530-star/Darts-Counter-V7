import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";
export const WAVE61_MODE_ID = "la_suite" as const;
export default function DedicatedWave61Play(props:any) { return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Compose trois nombres consécutifs sur une volée. Une suite valide marque, sinon la volée vaut 0." />; }
