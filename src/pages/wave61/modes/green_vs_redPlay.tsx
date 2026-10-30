import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "green_vs_red" as const;

export default function GreenVsRedPlay(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} forceGreenRedUi={true} dedicatedPlayHint="DUEL, TEAM ou MULTI : suis ta frise de couleur. Le bloc OBJECTIF du joueur actif détaille la cible courante ; les règles complètes restent accessibles via Awena dans le header." />;
}
