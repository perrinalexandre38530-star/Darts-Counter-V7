import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "darts_impossible" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [];

const DEDICATED_INTRO = "DARTS IMPOSSIBLE rejoint à son tour le catalogue Wave61 avec sa propre page Config. Cette base dédiée permet déjà de lancer des parties complètes avant l'ajout des réglages experts propres aux futures missions.";

/** Configuration dédiée à DARTS IMPOSSIBLE. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
