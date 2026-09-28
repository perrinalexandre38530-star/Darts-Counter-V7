import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "petit_bac" as const;

/** Écran Play dédié à LE PETIT BAC. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Valide les catégories dans l’ordre ; une réussite suit la lettre demandée et le BULL agit comme joker." />;
}
