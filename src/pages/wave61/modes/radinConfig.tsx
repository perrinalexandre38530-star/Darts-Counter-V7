import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "radin" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [];

const DEDICATED_INTRO = "RADIN démarre sur l'architecture dédiée Wave61. Le mode est déjà jouable en prototype complet ; ses paramètres avancés seront ajoutés dans une passe de finition spécifique.";

/** Configuration dédiée à RADIN. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
