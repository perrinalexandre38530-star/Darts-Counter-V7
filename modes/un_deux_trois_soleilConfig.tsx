import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "un_deux_trois_soleil" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "movePowerPct", label: "Puissance d’avancée", type: "select", defaultValue: 100, options: [{ value: 80, label: "80% · Prudent" },{ value: 100, label: "100% · Standard" },{ value: 125, label: "125% · Sprint" }] },
  { key: "stopPenalty", label: "Recul si tu bouges pendant SOLEIL", type: "select", defaultValue: 8, options: [{ value: 5, label: "5 · Tolérant" },{ value: 8, label: "8 · Standard" },{ value: 12, label: "12 · Sévère" }] },
  { key: "freezeBonus", label: "Bonus si tu restes parfaitement figé", type: "select", defaultValue: 3, options: [{ value: 0, label: "0 · Aucun" },{ value: 3, label: "3 · Standard" },{ value: 5, label: "5 · Maîtrise" }] },
];

const DEDICATED_INTRO = "Règle la vitesse d’avancée, la sanction quand tu bouges pendant SOLEIL et la récompense d’une immobilité parfaite.";

/** Configuration dédiée à 1, 2, 3 SOLEIL. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
