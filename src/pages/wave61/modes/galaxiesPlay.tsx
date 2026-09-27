import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "galaxies" as const;

/** Écran Play dédié à galaxies. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Colonise les systèmes, recharge l’hyperdrive et enchaîne les conquêtes avant les autres empires." />;
}
