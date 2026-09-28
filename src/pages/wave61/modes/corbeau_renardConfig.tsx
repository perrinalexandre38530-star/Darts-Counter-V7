import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "corbeau_renard" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "startingCheese", label: "Fromages de départ", type: "select", defaultValue: 2, options: [{ value: 1, label: "1" }, { value: 2, label: "2 · Standard" }, { value: 3, label: "3" }] },
  { key: "cheeseGoal", label: "Fromages pour gagner", type: "select", defaultValue: 6, options: [{ value: 5, label: "5 · Rapide" }, { value: 6, label: "6 · Standard" }, { value: 8, label: "8 · Long" }] },
  { key: "fableThreshold", label: "Ruse requise pour agir", type: "select", defaultValue: 5, options: [{ value: 4, label: "4 · Rapide" }, { value: 5, label: "5 · Standard" }, { value: 6, label: "6 · Tactique" }] },
  { key: "bullGuard", label: "Protection gagnée par BULL", type: "select", defaultValue: 1, options: [{ value: 0, label: "0 · Désactivée" }, { value: 1, label: "1 charge" }, { value: 2, label: "2 charges" }] },
];

const DEDICATED_INTRO = "Les Corbeaux fabriquent et protègent leur réserve ; les Renards accumulent de la ruse pour voler le fromage adverse. Les BULLS servent de protection.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
