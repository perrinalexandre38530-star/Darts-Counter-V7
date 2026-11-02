import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "une_ptite_raclette" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "seriesFormat", label: "Scoreboard / manches", type: "select", defaultValue: "single", options: [
    { value: "single", label: "1 MANCHE · sans scoreboard" }, { value: "bo3", label: "BO 3" }, { value: "bo5", label: "BO 5" }, { value: "bo7", label: "BO 7" }, { value: "ft3", label: "FT 3" }, { value: "ft5", label: "FT 5" }, { value: "ft7", label: "FT 7" },
  ], help: "Chaque manche prépare une nouvelle raclette ; le scoreboard conserve les manches gagnées." },

  { key: "recipeCheese", label: "Fromage nécessaire", type: "select", defaultValue: 6, options: [
    { value: 4, label: "4 portions" }, { value: 6, label: "6 portions" }, { value: 8, label: "8 portions" },
  ]},
  { key: "recipePotato", label: "Pommes de terre nécessaires", type: "select", defaultValue: 3, options: [
    { value: 2, label: "2 portions" }, { value: 3, label: "3 portions" }, { value: 4, label: "4 portions" },
  ]},
  { key: "recipeCharcuterie", label: "Charcuterie nécessaire", type: "select", defaultValue: 3, options: [
    { value: 2, label: "2 portions" }, { value: 3, label: "3 portions" }, { value: 4, label: "4 portions" },
  ]},
  { key: "racletteBonus", label: "Bonus par raclette servie", type: "select", defaultValue: 100, options: [
    { value: 50, label: "+50" }, { value: 100, label: "+100" }, { value: 150, label: "+150" },
  ]},
  { key: "visitVarietyBonus", label: "Bonus plateau complet", type: "select", defaultValue: 15, options: [
    { value: 0, label: "DÉSACTIVÉ" }, { value: 10, label: "+10" }, { value: 15, label: "+15" }, { value: 25, label: "+25" },
  ], help: "Toucher les trois familles d’ingrédients dans la même volée déclenche le bonus." },
  { key: "missPenalty", label: "Raclette refroidie · MISS", type: "select", defaultValue: 5, options: [
    { value: 0, label: "AUCUNE" }, { value: 5, label: "-5" }, { value: 10, label: "-10" }, { value: 20, label: "-20" },
  ]},
];

const DEDICATED_INTRO = "Prépare une raclette complète avant les autres : 1/4/7/10/13/16/19 = FROMAGE, 2/5/8/11/14/17/20 = POMMES DE TERRE, 3/6/9/12/15/18 = CHARCUTERIE. Simple = 1 portion, Double = 2, Triple = 3. Les Bulls chauffent tout le poêlon.";

export default function UnePtiteRacletteConfig(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
