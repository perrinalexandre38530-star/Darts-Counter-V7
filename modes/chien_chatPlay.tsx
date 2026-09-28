import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "chien_chat" as const;

/** Écran Play dédié à CHIEN & CHAT. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Suis ta piste, vise ton bonus Os/Poisson et utilise les BULLS pour prendre les raccourcis décisifs." />;
}
