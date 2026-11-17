import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";
export const WAVE61_MODE_ID = "mexicain" as const;
export default function MexicainPlay(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Cible commune à toute la manche · trois fléchettes · le score le plus faible perd une vie." />;
}
