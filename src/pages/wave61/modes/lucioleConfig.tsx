import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "luciole" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "revealMs", label: "Temps d’éclairage", type: "select", defaultValue: 1600, options: [{ value: 800, label: "0,8 s · Expert" },{ value: 1600, label: "1,6 s · Standard" },{ value: 2500, label: "2,5 s · Confort" }] },
  { key: "wrongPenalty", label: "Pénalité erreur", type: "select", defaultValue: 0, options: [{ value: 0, label: "Aucune" },{ value: 1, label: "-1 étape" },{ value: 2, label: "-2 étapes" }] },
];

const DEDICATED_INTRO = "Règle combien de temps la luciole reste visible et la pénalité appliquée en cas d’échec.";

/** Configuration dédiée à LUCIOLE. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
