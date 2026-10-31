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
  },
  {
    key: "contractRule",
    label: "Règle D/T de la volée",
    type: "select",
    defaultValue: "official_unique",
    options: [
      { value: "official_unique", label: "OFFICIELLE · 1 Double + 1 Triple max" },
      { value: "unlimited", label: "LIBRE · 3 touches D/T possibles" },
    ],
    help: "Officielle : un Double et un Triple maximum du numéro courant peuvent compter dans la même volée. Libre : les 3 fléchettes peuvent toutes compter si elles sont D/T sur la cible.",
  },
  {
    key: "scoreModel",
    label: "Comptage des points",
    type: "select",
    defaultValue: "hit_count",
    options: [
      { value: "hit_count", label: "ÉQUITABLE · 1 touche valide = 1 point" },
      { value: "board_value", label: "CIBLE RÉELLE · valeur D/T/BULL" },
    ],
    help: "ÉQUITABLE neutralise l'écart naturel entre les pistes Vert et Rouge. CIBLE RÉELLE conserve la valeur mathématique de la cible.",
  },
  {
    key: "bullAccess",
    label: "Accès au BULL pendant le parcours",
    type: "select",
    defaultValue: "final_only",
    options: [
      { value: "final_only", label: "FINALE UNIQUEMENT · étape 11" },
      { value: "color_anytime", label: "BULL DE COULEUR · jouable à chaque volée" },
    ],
    help: "BULL DE COULEUR : le joueur Vert peut tenter BULL 25 et le joueur Rouge BULL 50 à n'importe quelle étape, sans remplacer l'objectif D/T courant.",
  },
  {
    key: "bullRule",
    label: "Règle BULL de l'étape finale",
    type: "select",
    defaultValue: "classic",
    options: [
      { value: "classic", label: "CLASSIQUE · BULL 25 ou BULL 50" },
      { value: "color_lock", label: "BULL DE COULEUR · Vert=25 / Rouge=50" },
      { value: "color_bonus", label: "BULL BONUS · bonus sur le Bull de sa couleur" },
    ],
  },
  { key: "greenBullBonus", label: "Bonus BULL 25 · VERT", type: "number", defaultValue: 25, min: 0, max: 200, step: 5, help: "Utilisé uniquement avec BULL BONUS et le scoring CIBLE RÉELLE." },
  { key: "redBullBonus", label: "Bonus BULL 50 · ROUGE", type: "number", defaultValue: 50, min: 0, max: 200, step: 5, help: "Utilisé uniquement avec BULL BONUS et le scoring CIBLE RÉELLE." },
  {
    key: "penaltyModel",
    label: "Système de pénalités",
    type: "select",
    defaultValue: "transfer",
    options: [
      { value: "official", label: "OFFICIEL · valeur adverse retirée au tireur" },
      { value: "transfer", label: "MSS TRANSFERT · erreur = points à l'adversaire" },
      { value: "none", label: "AUCUNE PÉNALITÉ" },
    ],
    help: "OFFICIEL : toute valeur touchée sur la couleur adverse retire sa valeur réelle au tireur. MSS TRANSFERT : la pénalité est donnée à l'adversaire au lieu d'être retirée au tireur.",
  },
  { key: "transferBaseErrorPoints", label: "MSS TRANSFERT · erreur hors contrat", type: "number", defaultValue: 1, min: 0, max: 20, step: 1, help: "Valeur fixe offerte à l'adversaire pour une erreur hors contrat qui n'est ni un MISS ni une touche de sa couleur. En scoring CIBLE RÉELLE, la vraie valeur de la fléchette reste utilisée." },
  { key: "transferOppMultiplier", label: "MSS TRANSFERT · multiplicateur couleur adverse", type: "number", defaultValue: 2, min: 1, max: 5, step: 1, help: "Une touche sur la couleur adverse transfère la valeur de base × ce multiplicateur. Exemple en scoring équitable : ×2 = +2 à l'adversaire." },
  { key: "transferMissPoints", label: "MSS TRANSFERT · MISS · points offerts", type: "number", defaultValue: 2, min: 0, max: 50, step: 1, help: "Valeur FIXE donnée à l'adversaire pour chaque MISS. Si tu règles 10, chaque MISS donne exactement +10 à l'adversaire, quel que soit le scoring choisi." },
];

const DEDICATED_INTRO = "GREEN VS RED est paramétrable par familles de règles : D/T officiel ou libre, scoring équitable ou valeur réelle, BULL final ou BULL de couleur à chaque volée, et pénalités officielles, transfert MSS ou aucune pénalité. Convention : BULL désigne toujours le centre complet (zones 25 + 50). Les deux zones sont ensuite nommées séparément selon la langue. Chaque combinaison est enregistrée séparément dans l’historique/statistiques.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
