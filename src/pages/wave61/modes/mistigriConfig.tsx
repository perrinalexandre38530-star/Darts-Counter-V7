import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "mistigri" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "dangerThreshold", label: "Danger avant pénalité", type: "select", defaultValue: 3, options: [{ value: 2, label: "2 · Nerveux" }, { value: 3, label: "3 · Standard" }, { value: 4, label: "4 · Plus doux" }] },
  { key: "dangerPerMiss", label: "Danger ajouté si le Mistigri reste", type: "select", defaultValue: 1, options: [{ value: 1, label: "+1 · Standard" }, { value: 2, label: "+2 · Brutal" }] },
  { key: "bullShield", label: "Protection gagnée par BULL", type: "select", defaultValue: 1, options: [{ value: 0, label: "0 · Désactivée" }, { value: 1, label: "1 charge" }, { value: 2, label: "2 charges" }] },
];

const DEDICATED_INTRO = "Le Mistigri circule entre les joueurs. Valide la cible du tour pour t'en débarrasser ; si tu le gardes trop longtemps, tu perds une vie. Les BULLS peuvent fournir une protection.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
