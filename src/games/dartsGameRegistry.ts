// =============================================================
// src/games/dartsGameRegistry.ts
// Registry central des modes de jeu Flechettes
//
// - Onglets Games par categories
// - Tri par popularite
// - Ne casse pas les routes existantes (tab App.tsx)
// - Tous les boutons "i" doivent afficher des regles (infoTitle/infoBody)
// =============================================================

export type GameCategory =
  | "classic"
  | "variant"
  | "training"
  | "challenge"
  | "fun";

export type DartsGameTab =
  | "x01_config_v3"
  | "cricket"
  | "killer_config"
  | "shanghai"
  | "battle_royale"
  | "warfare_config"
  | "five_lives_config"
  | "training"
  | "tournaments"
  | "mode_not_ready";

export type DartsGameDef = {
  id: string;
  label: string;
  category: GameCategory;
  entry: "games" | "training";

  tab: DartsGameTab;

  baseGame?: "x01" | "cricket";
  variantId?: string;

  maxPlayers: number;
  supportsTeams: boolean;
  supportsBots: boolean;

  statsKey: string;
  ready: boolean;

  popularityRank?: number;

  infoTitle: string;
  infoBody: string;
};

export const dartsGameRegistry: DartsGameDef[] = [
  // ===========================================================
  // CLASSIQUES (routes existantes)
  // ===========================================================
  {
    id: "x01",
    label: "X01",
    category: "classic",
    entry: "games",
    tab: "x01_config_v3",
    popularityRank: 1,
    ready: true,
    maxPlayers: 8,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:x01",
    infoTitle: "X01",
    infoBody:
      "But: descendre a 0. Chaque flechette marque (S/D/T) sur son segment. Regles selon config: double-in (option), double-out (souvent), bust si tu depasses 0 ou finis sans respecter le double-out. Le vainqueur est celui qui finit en premier.",
  },
  {
    id: "cricket",
    label: "Cricket",
    category: "classic",
    entry: "games",
    tab: "cricket",
    popularityRank: 2,
    ready: true,
    maxPlayers: 8,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:cricket",
    infoTitle: "Cricket",
    infoBody:
      "Cibles: 15-16-17-18-19-20 + Bull. Il faut fermer chaque cible (3 marques) avant l'adversaire. Une fois une cible fermee par toi, tu peux marquer des points dessus tant que l'adversaire ne l'a pas fermee. Victoire selon regle: fermer tout et etre devant aux points (ou simple fermeture selon config).",
  },
  {
    id: "killer",
    label: "Killer",
    category: "classic",
    entry: "games",
    tab: "killer_config",
    popularityRank: 3,
    ready: true,
    maxPlayers: 12,
    supportsTeams: false,
    supportsBots: true,
    statsKey: "game:killer",
    infoTitle: "Killer",
    infoBody:
      "Chaque joueur a un numero. Phase 1: devenir Killer en touchant son numero (souvent double/selon config). Phase 2: une fois Killer, tu elimines les autres en touchant leur numero. Un joueur meurt quand ses vies/points tombent a 0 (selon les regles). Dernier survivant = victoire.",
  },
  {
    id: "shanghai",
    label: "Shanghai",
    category: "classic",
    entry: "games",
    tab: "shanghai",
    popularityRank: 4,
    ready: true,
    maxPlayers: 8,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:shanghai",
    infoTitle: "Shanghai",
    infoBody:
      "La cible change a chaque manche (souvent 1 puis 2 puis 3... jusqu'a 20). Tu marques uniquement sur la cible du round. Shanghai = faire Simple + Double + Triple de la cible dans la meme volee (3 fleches). Selon config: victoire immediate au Shanghai ou meilleur total a la fin.",
  },
  {
    id: "battle_royale",
    label: "Battle Royale",
    category: "classic",
    entry: "games",
    tab: "battle_royale",
    popularityRank: 5,
    ready: true,
    maxPlayers: 12,
    supportsTeams: false,
    supportsBots: true,
    statsKey: "game:battle_royale",
    infoTitle: "Battle Royale",
    infoBody:
      "Mode elimination. Les joueurs s'affrontent en tours; selon regles de la partie, un joueur peut etre elimine sur echec/objectif rate/points a 0. Le jeu continue jusqu'au dernier joueur restant. Variante fun: pression croissante, objectifs rapides, ou penalites.",
  },
  {
    id: "warfare",
    label: "Warfare",
    category: "classic",
    entry: "games",
    tab: "warfare_config",
    popularityRank: 6,
    ready: true,
    maxPlayers: 12,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:warfare",
    infoTitle: "Warfare",
    infoBody:
      "Jeu par camps. Chaque camp a des soldats (cibles) a proteger. Toucher une cible ennemie blesse ou elimine un soldat selon regle (S/D/T). Certaines variantes autorisent le friendly fire, la resurrection, ou le soin. Le camp qui elimine tous les soldats adverses gagne.",
  },
  {
    id: "five_lives",
    label: "Les 5 vies",
    category: "classic",
    entry: "games",
    tab: "five_lives_config",
    popularityRank: 7,
    ready: true,
    maxPlayers: 12,
    supportsTeams: false,
    supportsBots: true,
    statsKey: "game:five_lives",
    infoTitle: "Les 5 vies",
    infoBody:
      "Chaque joueur commence avec 5 vies. Vollee de 3 fleches: tu dois faire STRICTEMENT plus que le score total de la vollee precedente (du joueur avant toi). Si tu echoues, tu perds 1 vie. A 0 vie: elimine. Dernier joueur avec des vies = victoire.",
  },

  // ===========================================================
  // VARIANTES
  // ===========================================================
  {
    id: "enculette",
    label: "Enculette / Vache",
    category: "variant",
    entry: "games",
    tab: "cricket",
    baseGame: "cricket",
    variantId: "enculette",
    popularityRank: 20,
    ready: false,
    maxPlayers: 8,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:cricket:enculette",
    infoTitle: "Enculette / Vache (variante Cricket)",
    infoBody:
      "Variante de Cricket. Base: 15-20 + Bull. Particularites a definir (ex: penalites sur fermeture, priorites, ou regles de 'vache'). Pour l'instant: visible dans le menu; la logique sera ajoutee sans impacter Cricket standard.",
  },
  {
    id: "super_bull",
    label: "Super Bull",
    category: "variant",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 21,
    ready: false,
    maxPlayers: 8,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:super_bull",
    infoTitle: "Super Bull",
    infoBody:
      "Objectif centre. Points majoritairement sur Bull/DBull, avec bonus/malus selon config. Exemple classique: Bull = 25, DBull = 50, objectifs par manches, et victoire au meilleur total ou a un score cible. A implementer.",
  },
  {
    id: "happy_mille",
    label: "Happy Mille",
    category: "variant",
    entry: "games",
    tab: "x01_config_v3",
    baseGame: "x01",
    variantId: "happy_mille",
    popularityRank: 22,
    ready: false,
    maxPlayers: 8,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:x01:happy_mille",
    infoTitle: "Happy Mille (variante X01)",
    infoBody:
      "Variante orientee objectif. Exemple courant: atteindre 1000 points (ou autre seuil) en X volles, avec regles de bonus (triples) et penalites. Pour l'instant: mode reference; regles finales a figer avant engine.",
  },
  {
    id: "v170",
    label: "170",
    category: "variant",
    entry: "games",
    tab: "x01_config_v3",
    baseGame: "x01",
    variantId: "170",
    popularityRank: 23,
    ready: false,
    maxPlayers: 8,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:x01:170",
    infoTitle: "170 (checkout)",
    infoBody:
      "Defi checkout. Objectif: terminer 170 (T20 + T20 + Bull) ou serie de fins imposees. Variante possible: suite de checkouts a reussir, timer, ou points par finition. A implementer.",
  },
  {
    id: "scram",
    label: "Scram",
    category: "variant",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 24,
    ready: false,
    maxPlayers: 8,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:scram",
    infoTitle: "Scram (Cricket variant)",
    infoBody:
      "Variante Cricket en deux phases. Phase 1: une equipe ferme des nombres. Phase 2: l'autre equipe marque des points sur les nombres non fermes. A la fin, on inverse ou on compare selon regle. A implementer.",
  },

  // ===========================================================
  // CHALLENGE / OBJECTIFS
  // ===========================================================
  {
    id: "count_up",
    label: "Count-Up",
    category: "challenge",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 30,
    ready: false,
    maxPlayers: 8,
    supportsTeams: false,
    supportsBots: true,
    statsKey: "game:count_up",
    infoTitle: "Count-Up",
    infoBody:
      "Defi scoring simple: additionne tes points sur un nombre fixe de volles (ex: 10 volles). Points = valeurs S/D/T. Classement au meilleur total. A implementer.",
  },
  {
    id: "halve_it",
    label: "Halve-It",
    category: "challenge",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 31,
    ready: false,
    maxPlayers: 8,
    supportsTeams: false,
    supportsBots: true,
    statsKey: "game:halve_it",
    infoTitle: "Halve-It",
    infoBody:
      "Cible imposee par manche (ex: 20, 19, 18... Bull). Si tu touches la cible: tu ajoutes les points. Si tu ne touches pas la cible du round: ton score total est divise par 2. Meilleur score final gagne. A implementer.",
  },
  {
    id: "bobs_27",
    label: "Bob's 27",
    category: "challenge",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 32,
    ready: false,
    maxPlayers: 1,
    supportsTeams: false,
    supportsBots: false,
    statsKey: "game:bobs_27",
    infoTitle: "Bob's 27",
    infoBody:
      "Defi doubles. Tu commences a 27. Chaque round vise un double (D1 puis D2... ou liste). Double touche: + valeur du double. Double rate (0 double touche sur la volee): - valeur du double (ou penalite). A 0: perdu. A implementer.",
  },
  {
    id: "knockout",
    label: "Knockout",
    category: "challenge",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 33,
    ready: false,
    maxPlayers: 12,
    supportsTeams: false,
    supportsBots: true,
    statsKey: "game:knockout",
    infoTitle: "Knockout",
    infoBody:
      "Jeu elimination par score. Exemple classique: tu dois faire plus que le joueur precedent (ou atteindre une cible). En echec, tu perds une vie / tu es elimine. Variante proche des 5 vies mais configurable. A implementer.",
  },
  {
    id: "shooter",
    label: "Shooter",
    category: "challenge",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 34,
    ready: false,
    maxPlayers: 8,
    supportsTeams: false,
    supportsBots: true,
    statsKey: "game:shooter",
    infoTitle: "Shooter",
    infoBody:
      "Defi precision. Exemple: sequence de cibles a toucher (nombres, doubles, triples) avec points par reussite et penalites par raté. Format drills, timer possible. A implementer.",
  },
  {
    id: "baseball",
    label: "Baseball",
    category: "challenge",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 35,
    ready: false,
    maxPlayers: 4,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:baseball",
    infoTitle: "Baseball",
    infoBody:
      "9 manches. A la manche N, la cible est le numero N. Points = hits sur la cible (S=1xN, D=2xN, T=3xN selon regle). Variante: homerun sur Bull. Meilleur total gagne. A implementer.",
  },
  {
    id: "football",
    label: "Football (Foot)",
    category: "challenge",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 36,
    ready: false,
    maxPlayers: 4,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:football",
    infoTitle: "Football",
    infoBody:
      "Jeu a etapes (possession + tir). Exemple courant: gagner la possession en touchant Bull, puis marquer un but en touchant une zone cible (ex: doubles/triples) dans un nombre de fleches. Variantes multiples. A implementer.",
  },
  {
    id: "rugby",
    label: "Rugby",
    category: "challenge",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 37,
    ready: false,
    maxPlayers: 4,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:rugby",
    infoTitle: "Rugby",
    infoBody:
      "Jeu de territoires/essais. Exemple: progresser sur des zones (20->19->18...) puis marquer essai (Bull) et transformation (double). Le detail depend de la variante choisie. A implementer.",
  },
  {
    id: "capital",
    label: "Capital",
    category: "challenge",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 38,
    ready: false,
    maxPlayers: 8,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:capital",
    infoTitle: "Capital",
    infoBody:
      "Jeu a objectifs imposes par round. Exemple: chaque manche a une regle (ex: seulement doubles, seulement triples, seulement pairs/impairs). Les points valides comptent, les autres valent 0. Meilleur total gagne. A implementer.",
  },
  {
    id: "departements",
    label: "Departements",
    category: "challenge",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 39,
    ready: false,
    maxPlayers: 12,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:departements",
    infoTitle: "Departements",
    infoBody:
      "Jeu a cibles imposees selon une liste (numeros associes a des departements). Exemple: tirer une carte/departement puis toucher le numero correspondant. Points par reussite, objectifs par serie. A implementer.",
  },

  // ===========================================================
  // FUN / APERO
  // ===========================================================
  {
    id: "prisoner",
    label: "Prisoner",
    category: "fun",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 50,
    ready: false,
    maxPlayers: 12,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:prisoner",
    infoTitle: "Prisoner",
    infoBody:
      "Jeu fun a roles/etats. Exemple: un joueur devient prisonnier sur echec, les autres doivent le liberer en touchant une cible specifique. Le detail exact depend de ta variante (a preciser). A implementer.",
  },
  {
    id: "tic_tac_toe",
    label: "Tic-Tac-Toe",
    category: "fun",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 51,
    ready: false,
    maxPlayers: 2,
    supportsTeams: false,
    supportsBots: false,
    statsKey: "game:tic_tac_toe",
    infoTitle: "Tic-Tac-Toe",
    infoBody:
      "Grille 3x3. Chaque case correspond a une cible (ex: 1-9, doubles, ou zones). Un joueur prend une case en touchant la cible. 3 alignees = victoire. Variantes possibles. A implementer.",
  },
  {
    id: "bastard",
    label: "Batard",
    category: "fun",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 52,
    ready: false,
    maxPlayers: 12,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:batard",
    infoTitle: "Batard",
    infoBody:
      "Jeu fun type 'apero' avec regles maison (souvent objectifs et penalites). Donne-moi la regle exacte de ton club et je l'encode (sinon placeholder).",
  },

  // ===========================================================
  // TRAINING (hub existant + onglet Training)
  // ===========================================================
  {
    id: "training_x01",
    label: "Training X01",
    category: "training",
    entry: "training",
    tab: "training",
    popularityRank: 100,
    ready: true,
    maxPlayers: 1,
    supportsTeams: false,
    supportsBots: false,
    statsKey: "training:x01",
    infoTitle: "Training X01",
    infoBody:
      "Entrainement base sur X01. Drills de scoring, fins, routines. Stats dans Evolution. Lancement depuis le hub Training.",
  },
  {
    id: "tour_horloge",
    label: "Tour de l'horloge",
    category: "training",
    entry: "training",
    tab: "training",
    popularityRank: 101,
    ready: true,
    maxPlayers: 1,
    supportsTeams: false,
    supportsBots: false,
    statsKey: "training:clock",
    infoTitle: "Tour de l'horloge",
    infoBody:
      "Tu dois toucher les numeros dans l'ordre (souvent 1 a 20). Variantes: simples seulement, doubles, triples. Objectif: finir le tour avec le moins de fleches possible.",
  },
  {
    id: "training_evolution",
    label: "Evolution (stats)",
    category: "training",
    entry: "training",
    tab: "training",
    popularityRank: 999,
    ready: true,
    maxPlayers: 1,
    supportsTeams: false,
    supportsBots: false,
    statsKey: "training:evolution",
    infoTitle: "Evolution",
    infoBody:
      "Ce bouton ouvre les stats Training (progression, tendances, records). Ce n'est pas un mode de jeu; il doit etre affiche comme un raccourci stats.",
  },
  {
    id: "super_bull_training",
    label: "Super Bull (Training)",
    category: "training",
    entry: "training",
    tab: "mode_not_ready",
    popularityRank: 110,
    ready: false,
    maxPlayers: 1,
    supportsTeams: false,
    supportsBots: false,
    statsKey: "training:super_bull",
    infoTitle: "Super Bull (Training)",
    infoBody:
      "Drill centre. Exemple: series de 10 fleches, points Bull/DBull, objectifs progressifs. A implementer.",
  },
];

export default dartsGameRegistry;
export const DARTS_GAMES = dartsGameRegistry;

export const GAME_CATEGORIES: { id: GameCategory; label: string }[] = [
  { id: "classic", label: "Classiques" },
  { id: "variant", label: "Variantes" },
  { id: "challenge", label: "Defis" },
  { id: "fun", label: "Fun" },
  { id: "training", label: "Training" },
];

export function sortByPopularity(a: DartsGameDef, b: DartsGameDef) {
  const ar = a.popularityRank ?? 9999;
  const br = b.popularityRank ?? 9999;
  if (ar !== br) return ar - br;
  return a.label.localeCompare(b.label, "fr");
}
