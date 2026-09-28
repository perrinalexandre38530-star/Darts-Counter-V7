import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "chute_libre" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "startAltitude", label: "Altitude de départ", type: "select", defaultValue: 4000, options: [{ value: 3000, label: "3 000 m" },{ value: 4000, label: "4 000 m · Standard" },{ value: 5000, label: "5 000 m" }] },
  { key: "fallSpeedPct", label: "Vitesse de chute", type: "select", defaultValue: 100, options: [{ value: 80, label: "80% · Plus lente" },{ value: 100, label: "100% · Standard" },{ value: 125, label: "125% · Rapide" }] },
  { key: "parachuteWindowPct", label: "Largeur de la fenêtre parachute", type: "select", defaultValue: 100, options: [{ value: 80, label: "80% · Étroite" },{ value: 100, label: "100% · Standard" },{ value: 120, label: "120% · Large" }] },
];

const DEDICATED_INTRO = "Choisis l’altitude de saut, la vitesse de descente et la tolérance de la fenêtre dans laquelle le parachute peut être ouvert.";

/** Configuration dédiée à CHUTE LIBRE. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
