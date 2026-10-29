import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "nine_dart_century" as const;

/** Écran Play dédié à nine_dart_century. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Neuf fléchettes maximum : 100 exact est parfait. Sinon reste le plus près possible sans dépasser ; si tout le monde dépasse, le plus petit dépassement gagne." />;
}
