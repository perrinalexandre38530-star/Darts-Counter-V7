import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "jardinier" as const;

/** Écran Play dédié à LE JARDINIER. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Fais croître les plantes sans assécher le jardin ; les BULLS restaurent l’eau et chaque croissance complète produit une récolte." />;
}
