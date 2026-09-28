import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "green_vs_red" as const;

/** Écran Play dédié à green_vs_red. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Suis ta piste de couleur, accélère avec les triples et évite absolument de nourrir la progression adverse." />;
}
