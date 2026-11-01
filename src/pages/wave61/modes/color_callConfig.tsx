import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "color_call" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "seriesFormat", label: "Scoreboard / manches", type: "select", defaultValue: "single", options: [{ value: "single", label: "1 MANCHE · sans scoreboard" },{ value: "bo3", label: "BO 3" },{ value: "bo5", label: "BO 5" },{ value: "bo7", label: "BO 7" },{ value: "ft3", label: "FT 3" },{ value: "ft5", label: "FT 5" },{ value: "ft7", label: "FT 7" },{ value: "ft9", label: "FT 9" },{ value: "ft11", label: "FT 11" }] },
  { key: "callOrder", label: "Ordre des couleurs", type: "select", defaultValue: "cycle", options: [{ value: "cycle", label: "CYCLE · NOIR → BLANC → VERT → ROUGE" },{ value: "seeded", label: "ALÉATOIRE · reproductible à la reprise" }] },
  { key: "scoreMode", label: "Scoring des touches", type: "select", defaultValue: "real", options: [{ value: "real", label: "VALEUR RÉELLE" },{ value: "base", label: "NUMÉRO DU SECTEUR" },{ value: "hit", label: "1 POINT PAR TOUCHE" }] },
  { key: "wrongColorPenalty", label: "Mauvaise couleur", type: "select", defaultValue: 0, options: [{ value: 0, label: "0 · ignorée" },{ value: 2, label: "-2" },{ value: 5, label: "-5" },{ value: 10, label: "-10" }] },
  { key: "missPenalty", label: "MISS", type: "select", defaultValue: 0, options: [{ value: 0, label: "0 · ignoré" },{ value: 2, label: "-2" },{ value: 5, label: "-5" },{ value: 10, label: "-10" }] },
  { key: "perfectBonus", label: "Bonus volée parfaite", type: "select", defaultValue: 10, options: [{ value: 0, label: "0" },{ value: 10, label: "+10" },{ value: 25, label: "+25" },{ value: 50, label: "+50" }] },
];

const DEDICATED_INTRO = "Une couleur est appelée à chaque tour. Configure l’ordre d’appel, le scoring, les pénalités et le bonus d’une volée parfaite.";

export default function DedicatedWave61Config(props: any) { return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />; }
