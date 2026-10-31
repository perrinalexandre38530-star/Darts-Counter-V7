import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";
export const WAVE61_MODE_ID = "three_colors" as const;
export default function DedicatedWave61Play(props:any) { return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Réussis trois couleurs différentes sur la même volée. Si les 3 couleurs sont présentes, la somme réelle des impacts est ajoutée." />; }
