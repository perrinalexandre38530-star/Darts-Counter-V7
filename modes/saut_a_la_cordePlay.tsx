import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "saut_a_la_corde" as const;

/** Écran Play dédié à SAUT À LA CORDE. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Enchaîne les secteurs sans casser le combo ; plus le rythme monte, plus chaque série devient rentable." />;
}
