import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "saut_a_la_corde" as const;

/** Écran Play dédié à saut_a_la_corde.
 * Le moteur mutualisé reste en dessous; l'UI spécifique peut évoluer ici indépendamment.
 */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} />;
}
