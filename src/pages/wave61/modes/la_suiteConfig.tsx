import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "la_suite" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "sequenceOrder", label: "Ordre de la suite", type: "select", defaultValue: "any", options: [{ value: "any", label: "LIBRE · ex. 4-6-5 accepté" },{ value: "ascending", label: "STRICT · ordre croissant" }] },
  { key: "sequenceScoring", label: "Scoring", type: "select", defaultValue: "real", options: [{ value: "real", label: "VALEUR RÉELLE des impacts" },{ value: "sector", label: "VALEUR DES NUMÉROS" }] },
];

const DEDICATED_INTRO = "Compose trois nombres consécutifs sur une volée. Une suite valide marque, sinon la volée vaut 0.";

export default function DedicatedWave61Config(props: any) { return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />; }
