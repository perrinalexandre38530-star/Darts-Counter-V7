import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "corbeau_renard" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [];

const DEDICATED_INTRO = "Cette première version de CORBEAU & RENARD reprend tout le socle Wave61 mutualisé. Le moteur, les bots, l'historique et la reprise sont déjà branchés, avec une page dédiée prête à être enrichie ensuite.";

/** Configuration dédiée à CORBEAU & RENARD. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
