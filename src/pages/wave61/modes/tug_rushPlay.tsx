import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "tug_rush" as const;

/** Écran Play dédié à tug_rush.
 * Le moteur mutualisé reste en dessous; l'UI spécifique peut évoluer ici indépendamment.
 */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} />;
}
