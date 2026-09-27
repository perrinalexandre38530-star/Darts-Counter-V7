import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "un_deux_trois_soleil" as const;

/** Écran Play dédié à un_deux_trois_soleil.
 * Le moteur mutualisé reste en dessous; l'UI spécifique peut évoluer ici indépendamment.
 */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} />;
}
