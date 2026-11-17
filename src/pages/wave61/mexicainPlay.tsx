import React from "react";
import Wave61SharedPlay from "../Wave61SharedPlay";
export const WAVE61_MODE_ID = "mexicain" as const;
export default function MexicainPlay(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Fiesta mexicaine · cible commune pour toute la manche · 3 fléchettes · le plus petit score perd une vie." />;
}
