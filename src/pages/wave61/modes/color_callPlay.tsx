import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";
export const WAVE61_MODE_ID = "color_call" as const;
export default function DedicatedWave61Play(props:any) { return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Une couleur est appelée à chaque tour : NOIR, BLANC, VERT ou ROUGE. Seuls les impacts de cette couleur marquent." />; }
