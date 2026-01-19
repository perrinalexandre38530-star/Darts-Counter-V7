// =============================================================
// src/lib/dartsModesCatalog.ts
// Catalogue des nouveaux modes (Config + Play generiques)
// =============================================================
export type ModeCategory = "classic" | "variant" | "training" | "challenge" | "fun";

export type DartsModeDef = {
  id: string;
  label: string;
  category: ModeCategory;
  infoTitle: string;
  infoBody: string;
  // presets
  defaultRounds?: number;      // nombre de tours/volles (selon mode)
  defaultDarts?: number;       // fleches par tour
  targetScore?: number | null; // objectif optionnel (Count-Up etc.)
};

export const DARTS_NEW_MODES: DartsModeDef[] = [
  { id:"count_up", label:"Count-Up", category:"challenge",
    infoTitle:"Count-Up", infoBody:"Additionne tes points sur un nombre fixe de vollees. Meilleur total gagne (ou objectif).",
    defaultRounds:10, defaultDarts:3, targetScore:null },
  { id:"halve_it", label:"Halve-It", category:"training",
    infoTitle:"Halve-It", infoBody:"Cible imposee par round. Si tu ne touches pas la cible du round: ton score est divise par 2.",
    defaultRounds:10, defaultDarts:3 },
  { id:"bobs_27", label:"Bob's 27", category:"training",
    infoTitle:"Bob's 27", infoBody:"Entrainement doubles. Tu commences a 27. Chaque round vise un double: + si touche, - si rate.",
    defaultRounds:20, defaultDarts:3 },
  { id:"baseball", label:"Baseball", category:"challenge",
    infoTitle:"Baseball", infoBody:"9 manches. A la manche N, la cible est le numero N. Points selon S/D/T sur la cible.",
    defaultRounds:9, defaultDarts:3 },
  { id:"v170", label:"170", category:"training",
    infoTitle:"170 (Checkout)", infoBody:"Defi checkout. Objectif: reussir 170 (T20 T20 Bull) ou suite de fins imposees.",
    defaultRounds:10, defaultDarts:3 },
  { id:"football", label:"Football", category:"fun",
    infoTitle:"Football", infoBody:"Jeu a etapes (possession + tir). Variante generique: Bull pour possession puis zone pour marquer.",
    defaultRounds:10, defaultDarts:3 },
  { id:"rugby", label:"Rugby", category:"fun",
    infoTitle:"Rugby", infoBody:"Jeu de territoires/essais. Variante generique a etapes (progression puis essai + transformation).",
    defaultRounds:10, defaultDarts:3 },
  { id:"shooter", label:"Shooter", category:"training",
    infoTitle:"Shooter", infoBody:"Defi precision: sequence de cibles. Points par reussite, penalites possibles.",
    defaultRounds:10, defaultDarts:3 },
  { id:"super_bull", label:"Super Bull", category:"training",
    infoTitle:"Super Bull", infoBody:"Drill centre. Bull/DBull avec bonus. Objectif: accumuler le plus de points.",
    defaultRounds:10, defaultDarts:3 },
  { id:"tic_tac_toe", label:"Tic-Tac-Toe", category:"fun",
    infoTitle:"Tic-Tac-Toe", infoBody:"Grille 3x3. Prends une case en touchant la cible associee. 3 alignees = victoire.",
    defaultRounds:9, defaultDarts:3 },
  { id:"knockout", label:"Knockout", category:"fun",
    infoTitle:"Knockout", infoBody:"Jeu elimination. Variante generique: echec a battre le score precedent = penalite/elim.",
    defaultRounds:15, defaultDarts:3 },
  { id:"scram", label:"Scram", category:"variant",
    infoTitle:"Scram", infoBody:"Variante Cricket en deux phases: une equipe ferme, l'autre marque sur non-fermes. A affiner.",
    defaultRounds:10, defaultDarts:3 },
  { id:"capital", label:"Capital", category:"challenge",
    infoTitle:"Capital", infoBody:"Chaque round a une regle (doubles, triples, pairs/impairs...). Seuls les points valides comptent.",
    defaultRounds:10, defaultDarts:3 },
  { id:"departements", label:"Departements", category:"fun",
    infoTitle:"Departements", infoBody:"Liste de cibles imposees (departements). Points sur reussite. Variante a affiner.",
    defaultRounds:15, defaultDarts:3 },
  { id:"happy_mille", label:"Happy Mille", category:"challenge",
    infoTitle:"Happy Mille", infoBody:"Objectif de points (ex: 1000). Bonus/malus possibles. A affiner.",
    defaultRounds:20, defaultDarts:3, targetScore:1000 },
  { id:"prisoner", label:"Prisoner", category:"fun",
    infoTitle:"Prisoner", infoBody:"Jeu fun a etats/roles (prisonnier/liberation). Regles exactes a affiner.",
    defaultRounds:15, defaultDarts:3 },
  { id:"bastard", label:"Batard", category:"fun",
    infoTitle:"Batard", infoBody:"Jeu fun 'apero'. Placeholder en attendant tes regles exactes.",
    defaultRounds:10, defaultDarts:3 },
];

export function getModeById(id: string): DartsModeDef | undefined {
  return DARTS_NEW_MODES.find(m => m.id === id);
}
