import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "green_vs_red" as const;

/** Écran Play dédié à green_vs_red. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="DUEL, TEAM ou MULTI : le keypad ouvre la piste de la couleur du joueur actif. Sélectionne D ou T puis le secteur touché ; bascule sur la couleur adverse uniquement pour enregistrer une faute. À l’étape BULL, le keypad s’adapte automatiquement à la variante CLASSIQUE, BULL DE COULEUR ou BULL BONUS." />;
}
