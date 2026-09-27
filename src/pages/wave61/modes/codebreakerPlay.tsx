import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "codebreaker" as const;

/** Écran Play dédié à codebreaker. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Chaque volée propose une combinaison ; utilise les indices exacts et déplacés pour casser le code." />;
}
