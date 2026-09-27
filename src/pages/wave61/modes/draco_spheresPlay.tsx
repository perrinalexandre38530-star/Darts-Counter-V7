import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "draco_spheres" as const;

/** Écran Play dédié à draco_spheres. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Collecte les sept orbes et transforme les bulls et triples en énergie pour invoquer des orbes bonus." />;
}
