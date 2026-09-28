import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "mistigri" as const;

/** Écran Play dédié à MISTIGRI. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Évite de conserver le Mistigri, transmets les mauvaises situations au bon moment et profite de chaque ouverture pour rester hors de danger." />;
}
