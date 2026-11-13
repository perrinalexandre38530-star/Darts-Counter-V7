import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "shove_a_penny" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  {
    key: "ruleSet",
    label: "Version du jeu",
    type: "select",
    defaultValue: "traditional",
    options: [
      { value: "traditional", label: "TRADITIONNELLE · 1 à 9 · ordre libre" },
      { value: "electronic", label: "ÉLECTRONIQUE · 15 à 20 + BULL · dans l'ordre" },
    ],
    help: "Traditionnelle : tous les numéros 1–9 sont jouables librement, sans points, avec 3 marques par case. Électronique : fermeture obligatoire de 15 à BULL.",
  },
  {
    key: "marksPerBox",
    label: "Marques pour fermer",
    type: "select",
    defaultValue: 3,
    options: [
      { value: 3, label: "3 · Règle classique" },
      { value: 2, label: "2 · Partie rapide" },
      { value: 4, label: "4 · Partie longue" },
    ],
  },
  {
    key: "overflowRule",
    label: "Marques en surplus",
    type: "select",
    defaultValue: 1,
    options: [
      { value: 1, label: "Offertes au joueur suivant · Règle classique" },
      { value: 0, label: "Perdues" },
      { value: 2, label: "Converties en points · Variante MSS" },
    ],
  },
  {
    key: "giftTargetRule",
    label: "Destinataire des marques offertes (3+ joueurs)",
    type: "select",
    defaultValue: "next",
    options: [
      { value: "next", label: "Joueur suivant · Classique" },
      { value: "most_needed", label: "Joueur qui manque le plus de marques sur ce numéro" },
      { value: "shooter_choice", label: "Choix du lanceur, avant validation" },
    ],
    help: "En duel, les surplus vont forcément à l'adversaire. En multijoueur, choisis la règle de distribution avant de commencer.",
  },
  {
    key: "overflowBonus",
    label: "Valeur d'une marque convertie",
    type: "select",
    defaultValue: 25,
    options: [
      { value: 10, label: "+10 points" },
      { value: 25, label: "+25 points" },
      { value: 50, label: "+50 points" },
    ],
  },
];

const DEDICATED_INTRO =
  "SHOVE HA'PENNY : ferme chaque case en 3 marques. Simple = 1, Double = 2, Triple = 3. " +
  "Traditionnelle : 1 à 9 dans l'ordre que tu veux, sans Bull. " +
  "Électronique : 15 → 16 → 17 → 18 → 19 → 20 → BULL. " +
  "Les marques excédentaires sont offertes au joueur suivant, sauf si cela lui donnerait la dernière marque gagnante.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig
    {...props}
    forcedModeId={WAVE61_MODE_ID}
    dedicatedOptions={DEDICATED_OPTIONS}
    dedicatedIntro={DEDICATED_INTRO}
  />;
}
