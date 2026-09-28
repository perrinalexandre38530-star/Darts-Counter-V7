import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "eperviers" as const;

export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Les coureurs doivent traverser avant d’être touchés assez de fois. Chaque joueur capturé rejoint progressivement les Éperviers." />;
}
