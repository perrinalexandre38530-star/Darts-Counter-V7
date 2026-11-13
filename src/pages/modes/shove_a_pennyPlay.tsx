import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "shove_a_penny" as const;

/** Écran Play dédié à shove_a_penny. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Traditionnel : ferme les numéros 1 à 9 dans l’ordre de ton choix (3 marques par case). Un surplus profite à un adversaire ; la dernière marque de victoire doit être touchée soi-même. Variante électronique : 15 → 20 → BULL dans l’ordre." />;
}
