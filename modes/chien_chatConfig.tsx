import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "chien_chat" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "bonusMove", label: "Puissance Os / Poisson", type: "select", defaultValue: 10, options: [{ value: 8, label: "8 · Léger" },{ value: 10, label: "10 · Standard" },{ value: 14, label: "14 · Gros bonus" }] },
  { key: "bullShortcut", label: "Distance du raccourci BULL", type: "select", defaultValue: 12, options: [{ value: 8, label: "8 · Court" },{ value: 12, label: "12 · Standard" },{ value: 16, label: "16 · Long" }] },
  { key: "routePowerPct", label: "Puissance sur la piste", type: "select", defaultValue: 100, options: [{ value: 80, label: "80%" },{ value: 100, label: "100% · Standard" },{ value: 120, label: "120%" }] },
];

const DEDICATED_INTRO = "Dose les bonus propres aux chiens et aux chats, la longueur des raccourcis BULL et la vitesse normale sur la piste.";

/** Configuration dédiée à CHIEN & CHAT. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
