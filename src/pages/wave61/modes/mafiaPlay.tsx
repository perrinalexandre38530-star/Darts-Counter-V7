import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "mafia" as const;

/** Écran Play dédié à mafia. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="La nuit, exécute ton rôle en secret ; le jour, transforme chaque fléchette en vote décisif." />;
}
