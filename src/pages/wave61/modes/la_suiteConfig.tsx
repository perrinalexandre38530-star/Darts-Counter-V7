import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "la_suite" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "seriesFormat", label: "Scoreboard / manches", type: "select", defaultValue: "single", options: [{ value: "single", label: "1 MANCHE · sans scoreboard" },{ value: "bo3", label: "BO 3" },{ value: "bo5", label: "BO 5" },{ value: "bo7", label: "BO 7" },{ value: "ft3", label: "FT 3" },{ value: "ft5", label: "FT 5" },{ value: "ft7", label: "FT 7" },{ value: "ft9", label: "FT 9" },{ value: "ft11", label: "FT 11" }] },
  { key: "sequenceOrder", label: "Ordre de la suite", type: "select", defaultValue: "any", options: [{ value: "any", label: "LIBRE · ex. 4-6-5 accepté" },{ value: "ascending", label: "STRICT · ordre croissant" }] },
  { key: "sequenceScoring", label: "Scoring", type: "select", defaultValue: "real", options: [{ value: "real", label: "VALEUR RÉELLE des impacts" },{ value: "sector", label: "VALEUR DES NUMÉROS" }] },
  { key: "perfectVisitBonus", label: "Bonus suite réussie", type: "select", defaultValue: 0, options: [{ value: 0, label: "AUCUN" },{ value: 10, label: "+10" },{ value: 25, label: "+25" },{ value: 50, label: "+50" }] },
  { key: "invalidVisitPenalty", label: "Pénalité suite ratée", type: "select", defaultValue: 0, options: [{ value: 0, label: "VOLÉE = 0" },{ value: 5, label: "-5" },{ value: 10, label: "-10" },{ value: 25, label: "-25" }] },
  { key: "doublesTriples", label: "Doubles / Triples", type: "select", defaultValue: "allowed", options: [{ value: "allowed", label: "AUTORISÉS · multiplicateur compté" },{ value: "sector_only", label: "AUTORISÉS · numéro seulement" },{ value: "forbidden", label: "INTERDITS · volée ratée" }] },
];

const DEDICATED_INTRO = "Compose trois nombres consécutifs sur une volée. Choisis ordre, scoring, gestion des D/T, bonus de réussite et pénalité en cas d’échec.";

export default function DedicatedWave61Config(props: any) { return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />; }
