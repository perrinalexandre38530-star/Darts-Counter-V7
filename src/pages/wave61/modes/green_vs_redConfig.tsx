import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "green_vs_red" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "wrongColorPenaltyPct", label: "Touche adverse", type: "select", defaultValue: 100, options: [{ value: 100, label: "− valeur complète · Classique" },{ value: 50, label: "−50% · Clément" },{ value: 0, label: "Sans pénalité" }] },
];

const DEDICATED_INTRO = "Duel strict à 2 joueurs et 11 étapes. Vert : 1·4·6·15·17·19·16·11·9·5·BULL. Rouge : 20·12·14·8·7·3·2·10·13·18·BULL. Sur les 10 numéros, seuls DOUBLE et TRIPLE marquent ; un D et un T maximum par étape.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
