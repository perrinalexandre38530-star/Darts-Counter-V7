import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "shove_a_penny" as const;

/** Écran Play dédié à shove_a_penny. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Traditionnel : ferme librement les numéros 1 à 9. Électronique : ferme dans l’ordre 15 → 20 puis BULL. Chaque case exige 3 marques, et les surplus sont redistribués suivant la variante choisie." />;
}
