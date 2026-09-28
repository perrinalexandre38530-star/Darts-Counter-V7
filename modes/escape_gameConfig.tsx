import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "escape_game" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "directStepPower", label: "Verrous ouverts par réussite directe", type: "select", defaultValue: 1, options: [{ value: 1, label: "1 · Standard" },{ value: 2, label: "2 · Rapide" }] },
  { key: "bullJokerPower", label: "Puissance des jokers BULL", type: "select", defaultValue: 1, options: [{ value: 1, label: "×1 · Standard" },{ value: 2, label: "×2 · Puissant" },{ value: 3, label: "×3 · Maître des clés" }] },
  { key: "penaltyBackAfter", label: "Erreurs avant recul d’un verrou", type: "select", defaultValue: 3, options: [{ value: 2, label: "2 erreurs" },{ value: 3, label: "3 erreurs · Standard" },{ value: 4, label: "4 erreurs" }] },
];

const DEDICATED_INTRO = "Règle la vitesse d’ouverture des verrous, la puissance des BULLS joker et le nombre d’erreurs tolérées avant de perdre un verrou.";

/** Configuration dédiée à ESCAPE GAME. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
