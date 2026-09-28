import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "corbeau_renard" as const;

/** Écran Play dédié à CORBEAU & RENARD. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Protège ton fromage, tends des pièges de tempo et saisis les instants favorables pour faire tomber tes adversaires dans le panneau." />;
}
