import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "mistigri" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [];

const DEDICATED_INTRO = "Prépare les participants, l'ambiance et les aides partagées : cette première version dédiée de MISTIGRI s'appuie sur le socle Wave61 et pourra recevoir ses réglages exclusifs lors de la finalisation complète du mode.";

/** Configuration dédiée à MISTIGRI. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
