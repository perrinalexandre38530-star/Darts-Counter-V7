import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "chat_souris" as const;

/** Écran Play dédié à CHAT & SOURIS. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="La souris cherche le refuge pendant que le chat réduit l’écart ; les BULLS ouvrent les meilleurs raccourcis." />;
}
