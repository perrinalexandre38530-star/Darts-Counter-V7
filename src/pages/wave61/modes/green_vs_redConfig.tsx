import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "green_vs_red" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  {
    key: "matchFormat",
    label: "Format de partie",
    type: "select",
    defaultValue: "duel",
    options: [
      { value: "duel", label: "DUEL · 2 joueurs" },
      { value: "teams", label: "TEAM · 4 / 6 / 8 joueurs" },
      { value: "multi_random", label: "MULTI ALÉATOIRE · 3 à 10 joueurs" },
    ],
    help: "DUEL = 1 Vert contre 1 Rouge. TEAM = deux camps équilibrés. MULTI = couleur attribuée aléatoirement à chaque joueur au lancement.",
  },
  {
    key: "seriesFormat",
    label: "Scoreboard / manches",
    type: "select",
    defaultValue: "single",
    options: [
      { value: "single", label: "1 MANCHE · sans scoreboard" },
      { value: "bo3", label: "BO 3 · meilleur des 3" },
      { value: "bo5", label: "BO 5 · meilleur des 5" },
      { value: "bo7", label: "BO 7 · meilleur des 7" },
      { value: "ft3", label: "FT 3 · premier à 3" },
      { value: "ft5", label: "FT 5 · premier à 5" },
      { value: "ft7", label: "FT 7 · premier à 7" },
      { value: "ft9", label: "FT 9 · premier à 9" },
      { value: "ft11", label: "FT 11 · premier à 11" },
    ],
    help: "Le bandeau scoreboard apparaît sous le ticker uniquement lorsqu'une série BO/FT est sélectionnée.",
  },
  {
    key: "bullRule",
    label: "Variante BULL",
    type: "select",
    defaultValue: "classic",
    options: [
      { value: "classic", label: "CLASSIQUE · 25 et 50 pour tous" },
      { value: "color_lock", label: "BULL DE COULEUR · Vert=25 / Rouge=50" },
      { value: "color_bonus", label: "BULL BONUS · bonus sur le Bull de sa couleur" },
    ],
  },
  { key: "greenBullBonus", label: "Bonus BULL VERT 25", type: "number", defaultValue: 25, min: 0, max: 200, step: 5, help: "Utilisé uniquement avec la variante BULL BONUS." },
  { key: "redBullBonus", label: "Bonus BULL ROUGE 50", type: "number", defaultValue: 50, min: 0, max: 200, step: 5, help: "Utilisé uniquement avec la variante BULL BONUS." },
  {
    key: "wrongColorPenaltyPct",
    label: "Touche couleur adverse",
    type: "select",
    defaultValue: 100,
    options: [
      { value: 100, label: "− valeur complète · Classique" },
      { value: 50, label: "−50% · Clément" },
      { value: 0, label: "Sans pénalité" },
    ],
  },
];

const DEDICATED_INTRO = "Pistes officielles : VERT 1·4·6·15·17·19·16·11·9·5·BULL ; ROUGE 20·12·14·8·7·3·2·10·13·18·BULL. Sur les 10 numéros, seuls DOUBLE et TRIPLE comptent (un D et un T maximum par round). Un D/T adverse applique la pénalité choisie. La finale BULL dépend de la variante : classique, Bull de couleur, ou Bull bonus.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
