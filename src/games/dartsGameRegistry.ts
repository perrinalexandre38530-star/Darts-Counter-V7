// =============================================================
// src/games/dartsGameRegistry.ts
// Registry central des modes de jeu Flechettes
//
// - Onglets Games par categories
// - Tri par popularite
// - Ne casse pas les routes existantes (tab App.tsx)
// - Tous les boutons "i" doivent afficher des regles (infoTitle/infoBody)
// =============================================================

export type GameCategory = "classic" | "variant" | "training" | "challenge" | "fun";

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

  // entry sert a distinguer l'affichage "Games" vs "Training hub" si besoin,
  // mais Games.tsx liste par category/tab/entry (selon ton patch).
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

  // ✅ (12) GOLF en Classique (placeholder engine)
  {
    id: "golf",
    label: "Golf",
    category: "classic",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 8,
    ready: false,
    maxPlayers: 8,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:golf",
    infoTitle: "Golf",
    infoBody:
      "Jeu en manches (9/18). A la manche N, la cible est le numero N (ou une liste). Scoring selon variante (S/D/T). Objectif courant: score le plus bas. A implementer.",
  },

  // ✅ (7) SCRAM en Classique (placeholder engine)
  {
    id: "scram",
    label: "Scram",
    category: "classic",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 9,
    ready: false,
    maxPlayers: 8,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:scram",
    infoTitle: "Scram",
    infoBody:
      "Variante type Cricket a roles (closer/scorer). Une equipe ferme des cibles, l'autre marque sur celles non fermee. Puis inversion. Total points gagne. A implementer.",
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
      "Variante de Cricket. Base: 15-20 + Bull. Particularites a definir (penalites, priorites...). Pour l'instant: visible dans le menu; logique a ajouter.",
  },

  // ✅ (4) CUT-THROAT CRICKET (variante)
  {
    id: "cricket_cut_throat",
    label: "Cricket Cut-Throat",
    category: "variant",
    entry: "games",
    tab: "cricket",
    baseGame: "cricket",
    variantId: "cut_throat",
    popularityRank: 21,
    ready: false,
    maxPlayers: 8,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:cricket:cut_throat",
    infoTitle: "Cut-Throat Cricket",
    infoBody:
      "Quand tu marques sur une cible fermee par TOI (et pas fermee par l'adversaire), les points sont AJOUTES au score des adversaires (au lieu du tien). A implementer dans le moteur Cricket (toggle variante).",
  },

  {
    id: "super_bull",
    label: "Super Bull",
    category: "variant",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 22,
    ready: false,
    maxPlayers: 8,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:super_bull",
    infoTitle: "Super Bull",
    infoBody:
      "Objectif centre. Points sur Bull/DBull, bonus/malus selon config. Victoire au meilleur total ou score cible. A implementer.",
  },
  {
    id: "happy_mille",
    label: "Happy Mille",
    category: "variant",
    entry: "games",
    tab: "x01_config_v3",
    baseGame: "x01",
    variantId: "happy_mille",
    popularityRank: 23,
    ready: false,
    maxPlayers: 8,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:x01:happy_mille",
    infoTitle: "Happy Mille (variante X01)",
    infoBody:
      "Variante orientee objectif. Exemple: atteindre 1000 points (ou autre seuil) avec regles de bonus (triples) et penalites. A figer avant engine.",
  },
  {
    id: "v170",
    label: "170",
    category: "variant",
    entry: "games",
    tab: "x01_config_v3",
    baseGame: "x01",
    variantId: "170",
    popularityRank: 24,
    ready: false,
    maxPlayers: 8,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:x01:170",
    infoTitle: "170 (checkout)",
    infoBody:
      "Defi checkout. Objectif: terminer 170 (T20 + T20 + Bull) ou checkouts imposes. A implementer.",
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
      "Defi scoring: additionne tes points sur un nombre fixe de volles (ex: 10). Classement au meilleur total. A implementer.",
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
      "Cible imposee par manche (20, 19, 18... Bull). Si tu ne touches pas la cible du round: ton total est divise par 2. A implementer.",
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
      "Defi doubles. Tu commences a 27. Chaque round vise un double. Double touche: + points. 0 double touche sur la volee: penalite. A implementer.",
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
      "Jeu elimination par score. Variante proche des 5 vies mais configurable. A implementer.",
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
      "Defi precision: sequence de cibles a toucher, points et penalites. Timer possible. A implementer.",
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
      "9 manches. Manche N: cible = N. Points selon hits (S/D/T). Meilleur total gagne. A implementer.",
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
      "Jeu a etapes: possession (Bull) puis tir/but sur zones. Variantes multiples. A implementer.",
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
      "Jeu de territoires/essais. Progression par zones puis essai (Bull) et transformation (double). A implementer.",
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
      "Objectifs par round (doubles seulement, triples seulement, pairs/impairs...). Points valides uniquement. A implementer.",
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
      "Cibles imposees selon liste (numeros associes). Points par reussite, objectifs par serie. A implementer.",
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
      "Jeu fun a roles. Un joueur devient prisonnier sur echec, les autres le liberent via une cible. A implementer.",
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
      "Grille 3x3. Chaque case = cible. Une case est prise si la cible est touchee. 3 alignees = victoire. A implementer.",
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
      "Jeu fun type apero avec regles maison. Donne la regle exacte et je l'encode (sinon placeholder).",
  },

  // (13) mode fun global (placeholder)
  {
    id: "fun_gages",
    label: "Gages / Mode Fun",
    category: "fun",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 53,
    ready: false,
    maxPlayers: 12,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:fun_gages",
    infoTitle: "Gages / Mode Fun",
    infoBody:
      "Mode fun transversal (gages) declenche sur des evenements (bust, 180, bull...). A brancher via un toggle Settings + overlay gage. A implementer.",
  },

  // ===========================================================
  // TRAINING (hub existant + onglet Training dans Games)
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
      "Entrainement base sur X01. Drills de scoring, fins, routines. Stats via la carte Evolution (dans le hub Training).",
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
      "Toucher les numeros dans l'ordre (souvent 1 a 20). Variantes: simples, doubles, triples. Objectif: finir avec le moins de fleches possible.",
  },

  // ✅ AJOUT: ces 2 cartes doivent apparaitre dans Games > onglet Training
  {
    id: "training_doubleio",
    label: "Double In / Double Out",
    category: "training",
    entry: "training",
    tab: "training",
    popularityRank: 102,
    ready: false,
    maxPlayers: 1,
    supportsTeams: false,
    supportsBots: false,
    statsKey: "training:doubleio",
    infoTitle: "Double In / Double Out",
    infoBody:
      "Drill DI/DO. Objectif: fiabiliser tes doubles. Variantes: Double-In, Double-Out ou les deux. Format possible: tentatives ou mini X01. A implementer.",
  },
  {
    id: "training_challenges",
    label: "Challenges",
    category: "training",
    entry: "training",
    tab: "training",
    popularityRank: 103,
    ready: false,
    maxPlayers: 1,
    supportsTeams: false,
    supportsBots: false,
    statsKey: "training:challenges",
    infoTitle: "Challenges (Training)",
    infoBody:
      "Pack de mini-defis (doubles, bull, triples, regularite). Format court, stats de reussite et series. A implementer.",
  },

  {
    id: "super_bull_training",
    label: "Super Bull (Training)",
    category: "training",
    entry: "training",
    tab: "training",
    popularityRank: 110,
    ready: false,
    maxPlayers: 1,
    supportsTeams: false,
    supportsBots: false,
    statsKey: "training:super_bull",
    infoTitle: "Super Bull (Training)",
    infoBody:
      "Drill centre. Series de fleches, points Bull/DBull, objectifs progressifs. A implementer.",
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
