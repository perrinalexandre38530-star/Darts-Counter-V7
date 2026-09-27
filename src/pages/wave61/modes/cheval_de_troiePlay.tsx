import React from "react";
import Wave61SharedPlay from "../../Wave61SharedPlay";

export const WAVE61_MODE_ID = "cheval_de_troie" as const;

/** Écran Play dédié à cheval_de_troie. */
export default function DedicatedWave61Play(props: any) {
  return <Wave61SharedPlay {...props} forcedModeId={WAVE61_MODE_ID} dedicatedPlayHint="Construis, assiège puis infiltre la cité en maintenant l’alerte sous contrôle jusqu’à la citadelle." />;
}
