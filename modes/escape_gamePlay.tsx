import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "escape_game" as const;

/** Écran Play dédié à ESCAPE GAME. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Ouvre les verrous dans l’ordre, utilise les BULLS comme jokers et évite d’accumuler assez d’erreurs pour reculer." />;
}
