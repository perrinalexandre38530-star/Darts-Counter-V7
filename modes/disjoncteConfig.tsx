import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "disjoncte" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "hitOverloadPct", label: "Surcharge générée par les réussites", type: "select", defaultValue: 100, options: [{ value: 75, label: "75%" },{ value: 100, label: "100% · Standard" },{ value: 130, label: "130%" }] },
  { key: "wrongOverload", label: "Surcharge par erreur", type: "select", defaultValue: 10, options: [{ value: 6, label: "6%" },{ value: 10, label: "10% · Standard" },{ value: 15, label: "15%" }] },
  { key: "bullCooling", label: "Refroidissement BULL", type: "select", defaultValue: 28, options: [{ value: 18, label: "18%" },{ value: 28, label: "28% · Standard" },{ value: 40, label: "40%" }] },
];

const DEDICATED_INTRO = "Règle la charge produite par les circuits, la surcharge causée par les erreurs et la capacité des BULLS à refroidir le tableau.";

/** Configuration dédiée à DISJONCTÉ. */
export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
