import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "three_colors" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  {
    key: "seriesFormat",
    label: "Scoreboard / manches",
    type: "select",
    defaultValue: "single",
    options: [
      { value: "single", label: "1 MANCHE · sans scoreboard" },
      { value: "bo3", label: "BO 3" }, { value: "bo5", label: "BO 5" }, { value: "bo7", label: "BO 7" },
      { value: "ft3", label: "FT 3" }, { value: "ft5", label: "FT 5" }, { value: "ft7", label: "FT 7" },
      { value: "ft9", label: "FT 9" }, { value: "ft11", label: "FT 11" },
    ],
    help: "Même logique que GREEN VS RED : chaque manche repart à 0, le scoreboard conserve les manches gagnées jusqu'au BO/FT choisi.",
  },
  {
    key: "scoreMode",
    label: "Score d'une volée réussie",
    type: "select",
    defaultValue: "real",
    options: [
      { value: "real", label: "VALEUR RÉELLE · somme des 3 impacts" },
      { value: "base", label: "SECTEURS · somme des numéros sans multiplicateur" },
    ],
    help: "La règle standard utilise la valeur réelle de la cible. Le mode Secteurs neutralise Double/Triple pour une partie plus accessible.",
  },
  {
    key: "perfectVisitBonus",
    label: "Bonus volée 3 couleurs",
    type: "number",
    defaultValue: 0,
    min: 0,
    max: 100,
    step: 5,
    help: "Bonus ajouté uniquement lorsqu'une volée contient exactement 3 couleurs différentes valides.",
  },
  {
    key: "bullColors",
    label: "BULL 25 / 50",
    type: "select",
    defaultValue: "colors",
    options: [
      { value: "colors", label: "COULEURS · 25=VERT / 50=ROUGE" },
      { value: "neutral", label: "NEUTRES · les Bulls ne comptent pas comme couleur" },
    ],
    help: "En mode Couleurs, les deux Bulls peuvent compléter une combinaison de trois couleurs. En mode Neutres, ils peuvent rapporter des points uniquement si la volée reste valide avec les trois autres impacts, ce qui est impossible sur une volée de 3 : ils rendent donc la volée invalide.",
  },
  {
    key: "invalidVisitPenalty",
    label: "Pénalité volée incomplète",
    type: "number",
    defaultValue: 0,
    min: 0,
    max: 100,
    step: 5,
    help: "0 = règle classique : une volée qui n'obtient pas trois couleurs différentes marque simplement 0.",
  },
];

const DEDICATED_INTRO = "LES 3 COULEURS se joue sur une volée complète de trois fléchettes. Chaque impact appartient à une couleur de cible : NOIR, BLANC, VERT ou ROUGE. Pour marquer, les trois fléchettes doivent former trois couleurs différentes. Une volée valide marque la somme configurée des impacts ; une volée incomplète vaut 0, sauf pénalité optionnelle. Le meilleur total après le nombre de rounds choisi gagne.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
