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
  | "golf_config"
  | "scram_config"
  | "enculette_config"
  | "super_bull_config"
  | "happy_mille_config"
  | "game_170_config"
  | "halve_it_config"
  | "bobs_27_config"
  | "knockout_config"
  | "shooter_config"
  | "baseball_config"
  | "football_config"
  | "rugby_config"
  | "capital_config"
  | "departements_config"
  | "prisoner_config"
  | "tic_tac_toe_config"
  | "batard_config"
  | "training"
  | "tournaments"
  | "darts_mode"
  | "darts_mode_config"
  | "count_up_config"
  | "mode_not_ready";

export type DartsGameDef = {
  id: string;
  // Sous-categorie d'affichage (groupes a l'interieur d'un onglet Games)
  subCategory?: string;
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

const rawDartsGameRegistry: DartsGameDef[] = [
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
    tab: "golf_config",
    popularityRank: 8,
    ready: true,
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
    tab: "scram_config",
    popularityRank: 9,
    ready: true,
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
    tab: "enculette_config",
    popularityRank: 20,
    ready: true,
    maxPlayers: 4,
    supportsTeams: false,
    supportsBots: true,
    statsKey: "game:enculette",
    infoTitle: "Enculette / Vache",
    infoBody:
      "Mode score sur X rounds. Chaque volée ajoute ses points. Si tu fais 0 : pénalité -50. Objectif optionnel : premier à l'atteindre gagne. Si objectif = 0 : meilleur total en fin de rounds.",
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
    ready: true,
    maxPlayers: 8,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:cricket:cut_throat",
    infoTitle: "Cut-Throat Cricket",
    infoBody:
      "Quand tu marques sur une cible fermee par TOI (et pas fermee par l'adversaire), les points sont AJOUTES au score des adversaires (au lieu du tien). Variante activee : points attribues aux adversaires encore ouverts sur la cible.",
  },

  {
    id: "super_bull",
    label: "Super Bull",
    category: "variant",
    entry: "games",
    tab: "super_bull_config",
    popularityRank: 22,
    ready: true,
    maxPlayers: 4,
    supportsTeams: false,
    supportsBots: true,
    statsKey: "game:super_bull",
    infoTitle: "Super Bull",
    infoBody:
      "Mode MVP jouable : volées (0..180) sur X rounds. Objectif optionnel : premier à l'atteindre gagne. La version Bull/DBull dédiée sera consolidée ensuite.",
  },
  {
    id: "happy_mille",
    label: "Happy Mille",
    category: "variant",
    entry: "games",
    tab: "happy_mille_config",
    baseGame: "x01",
    variantId: "happy_mille",
    popularityRank: 23,
    ready: true,
    maxPlayers: 4,
    supportsTeams: false,
    supportsBots: true,
    statsKey: "game:happy_mille",
    infoTitle: "Happy Mille",
    infoBody:
      "Course au score sur X rounds. Objectif par défaut 1000 (modifiable). Premier à atteindre l'objectif gagne, sinon meilleur total en fin de rounds.",
  },
  {
    id: "v170",
    label: "170",
    category: "variant",
    entry: "games",
    tab: "game_170_config",
    baseGame: "x01",
    variantId: "170",
    popularityRank: 24,
    ready: true,
    maxPlayers: 4,
    supportsTeams: false,
    supportsBots: true,
    statsKey: "game:v170",
    infoTitle: "170",
    infoBody:
      "Défi 170 : tu marques 1 point si ta volée fait exactement 170. Après X rounds, celui qui a le plus de réussites gagne.",
  },

  // ===========================================================
  // CHALLENGE / OBJECTIFS
  // ===========================================================
  {
    id: "count_up",
    label: "Count-Up",
    category: "challenge",
    entry: "games",
    tab: "count_up_config",
    popularityRank: 30,
    ready: true,
    maxPlayers: 4,
    supportsTeams: false,
    supportsBots: true,
    statsKey: "game:count_up",
    infoTitle: "Count-Up",
    infoBody:
      "Additionne tes points sur X rounds. Objectif optionnel : premier à l'atteindre gagne. Sinon meilleur total en fin de rounds.",
  },
  {
    id: "halve_it",
    label: "Halve-It",
    category: "challenge",
    entry: "games",
    tab: "halve_it_config",
    popularityRank: 31,
    ready: true,
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
    tab: "bobs_27_config",
    popularityRank: 32,
    ready: true,
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
    tab: "knockout_config",
    popularityRank: 33,
    ready: true,
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
    tab: "shooter_config",
    popularityRank: 34,
    ready: true,
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
    tab: "baseball_config",
    popularityRank: 35,
    ready: true,
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
    tab: "football_config",
    popularityRank: 36,
    ready: true,
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
    tab: "rugby_config",
    popularityRank: 37,
    ready: true,
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
    tab: "capital_config",
    popularityRank: 38,
    ready: true,
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
    label: "TERRITORIES",
    category: "challenge",
    entry: "games",
    tab: "departements_config",
    popularityRank: 39,
    ready: true,
    maxPlayers: 12,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:departements",
    infoTitle: "TERRITORIES",
    infoBody:
      "Mode TERRITORIES : cartes (FR/EN/WORLD) + variantes de zones (IT/DE/ES). Objectifs territoriaux a implementer.",
  },

  // ===========================================================
  // FUN / APERO
  // ===========================================================
  {
    id: "prisoner",
    label: "Prisoner",
    category: "fun",
    entry: "games",
    tab: "prisoner_config",
    popularityRank: 50,
    ready: true,
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
    tab: "tic_tac_toe_config",
    popularityRank: 51,
    ready: true,
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
    tab: "batard_config",
    popularityRank: 52,
    ready: true,
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
    ready: true,
    maxPlayers: 12,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:fun_gages",
    infoTitle: "Gages / Mode Fun",
    infoBody:
      "Mode fun transversal (gages) declenche sur des evenements (bust, 180, bull...). A brancher via un toggle Settings + overlay gage. A implementer.",
  },



  // ===========================================================
  // FUN / ARCADE / STRATEGIE / SURVIE (nouveaux modes a developper)
  // - Tous ces modes sont declares pour apparaitre dans Games
  // - Ils ouvrent pour l'instant l'ecran 'mode_not_ready'
  // ===========================================================

  // 🎳 BOWLING
  {
    id: "bowling",
    label: "Bowling",
    category: "fun",
    subCategory: "arcade",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 54,
    ready: true,
    maxPlayers: 8,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:bowling",
    infoTitle: "Bowling",
    infoBody:
      "Adapte le bowling aux flechettes. Format 10 frames. Chaque frame: 1 (ou 2) vollee(s) selon STRIKE/SPARE. Variante simple: Bull/DBull = strike, doubles = spare, sinon tu marques des quilles selon une table de conversion. A implementer.",
  },

  // 🔢 BINGO
  {
    id: "bingo",
    label: "Bingo",
    category: "fun",
    subCategory: "party",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 55,
    ready: true,
    maxPlayers: 8,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:bingo",
    infoTitle: "Bingo",
    infoBody:
      "Chaque joueur a une grille (3x3 ou 5x5) de cibles (ex: 20, D16, Bull...). Une case est validee si la cible est touchee. Objectif: ligne/colonne/diagonale ou full card selon regle. Grilles aleatoires ou communes. A implementer.",
  },

  // 🏁 FOLLOW THE LEADER
  {
    id: "follow_the_leader",
    label: "Follow the Leader",
    category: "fun",
    subCategory: "battle",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 56,
    ready: true,
    maxPlayers: 8,
    supportsTeams: false,
    supportsBots: true,
    statsKey: "game:follow_the_leader",
    infoTitle: "Follow the Leader",
    infoBody:
      "Le leader lance une vollee. Les suivants doivent reproduire exactement (numero + multiplicateur) ou partiellement (numero seulement) selon config. Echec = penalite (vie, points, elimination). Variante 'Chase/Copycat'. A implementer.",
  },

  // 🏎️ MARIO KART (Darts Racing)
  {
    id: "mario_kart",
    label: "Mario Kart",
    category: "fun",
    subCategory: "arcade",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 57,
    ready: true,
    maxPlayers: 8,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:mario_kart",
    infoTitle: "Mario Kart",
    infoBody:
      "Course sur piste (cases) pilotee par les hits. Triples = boost, doubles = mini-boost, Bull = turbo / item. Des cases declenchent des objets (attaque, bouclier, ralentissement). Premier a franchir l'arrivee gagne. A implementer.",
  },

  // 🚢 BATAILLE NAVALE (Darts Battleship)
  {
    id: "battleship",
    label: "Bataille Navale",
    category: "fun",
    subCategory: "strategie",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 58,
    ready: true,
    maxPlayers: 4,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:battleship",
    infoTitle: "Bataille Navale",
    infoBody:
      "Chaque joueur place une flotte sur une grille de segments (ex: 1-20 + Bull, ou grille custom). Les tirs annoncent une case/segment: touche, coule, rate. Variantes: brouillard de guerre, radar (Bull), frappe multiple (DBull). Victoire: detruire la flotte adverse. A implementer.",
  },

  // ♟️ TERRITORY / CONQUEST
  {
    id: "conquest",
    label: "Territory / Conquest",
    category: "fun",
    subCategory: "strategie",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 59,
    ready: true,
    maxPlayers: 8,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:conquest",
    infoTitle: "Territory / Conquest",
    infoBody:
      "Controle de zones. Chaque segment (ou groupe) est une zone. Toucher une zone la capture (ou ajoute de l'influence). Les adversaires peuvent reprendre. Victoire: majorite de zones ou objectif de domination (Bull central). A implementer.",
  },

  // 🧩 DOMINATION
  {
    id: "domination",
    label: "Domination",
    category: "fun",
    subCategory: "strategie",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 60,
    ready: true,
    maxPlayers: 8,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:domination",
    infoTitle: "Domination",
    infoBody:
      "Chaque round impose une contrainte (doubles uniquement, impairs, bull obligatoire, etc.). Les points/effets ne comptent que si la contrainte est respectee. Variante duel ou equipe. A implementer.",
  },

  // 💣 MINES & TRAPS
  {
    id: "mines_traps",
    label: "Mines & Traps",
    category: "fun",
    subCategory: "strategie",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 61,
    ready: true,
    maxPlayers: 8,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:mines_traps",
    infoTitle: "Mines & Traps",
    infoBody:
      "Chaque joueur place des pieges (segments) de facon cachee. Toucher un piege declenche un malus (perte de points/vie, blocage de tour, etc.). Bull peut servir a scanner ou desamorcer. A implementer.",
  },

  // ☠️ LAST MAN STANDING
  {
    id: "last_man_standing",
    label: "Last Man Standing",
    category: "fun",
    subCategory: "survie",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 62,
    ready: true,
    maxPlayers: 12,
    supportsTeams: false,
    supportsBots: true,
    statsKey: "game:last_man_standing",
    infoTitle: "Last Man Standing",
    infoBody:
      "Chaque joueur a X vies. Chaque tour, une cible (ou objectif) est imposee. Si tu ne reussis pas, tu perds une vie. A 0 vie: elimine. Dernier survivant gagne. A implementer.",
  },

  // 💣 BOMB / COUNTDOWN
  {
    id: "bomb_countdown",
    label: "Bomb / Countdown",
    category: "fun",
    subCategory: "survie",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 63,
    ready: true,
    maxPlayers: 12,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:bomb_countdown",
    infoTitle: "Bomb / Countdown",
    infoBody:
      "Un compteur descend. Les hits le font baisser (plus tu touches fort, plus ca baisse). Les ratés accelerent la chute. Perdant: celui qui provoque l'explosion (arrive a 0) selon regle. A implementer.",
  },

  // 🧟 INFECTION
  {
    id: "infection",
    label: "Infection",
    category: "fun",
    subCategory: "survie",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 64,
    ready: true,
    maxPlayers: 12,
    supportsTeams: false,
    supportsBots: true,
    statsKey: "game:infection",
    infoTitle: "Infection",
    infoBody:
      "Un joueur est infecte au depart. Toucher un adversaire propage l'infection (selon cible/condition). Objectif: etre le dernier non infecte ou survivre le plus longtemps. A implementer.",
  },

  // 🎲 RANDOMIZER
  {
    id: "randomizer",
    label: "Randomizer",
    category: "fun",
    subCategory: "party",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 65,
    ready: true,
    maxPlayers: 12,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:randomizer",
    infoTitle: "Randomizer",
    infoBody:
      "A chaque vollee: cible + regle + bonus/malus tires au sort (ex: doubles only, -10 si miss, +turbo si bull). Mode chaos tres rejouable. A implementer.",
  },

  // 🎰 CASINO
  {
    id: "casino",
    label: "Casino",
    category: "fun",
    subCategory: "party",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 66,
    ready: true,
    maxPlayers: 12,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:casino",
    infoTitle: "Casino",
    infoBody:
      "Chaque segment declenche un effet (gain, vol, inversion, banqueroute...). Bull = jackpot. Objectif: atteindre un score cible ou finir meilleur total. A implementer.",
  },

  // 🌀 CHAOS MODE
  {
    id: "chaos_mode",
    label: "Chaos Mode",
    category: "fun",
    subCategory: "party",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 67,
    ready: true,
    maxPlayers: 12,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:chaos_mode",
    infoTitle: "Chaos Mode",
    infoBody:
      "Les regles changent toutes les X fleches (contraintes, bonus, malus). Objectif: survivre ou maximiser le score selon config. A implementer.",
  },

  // 🤝 CO-OP MISSION
  {
    id: "coop_mission",
    label: "Co-op Mission",
    category: "fun",
    subCategory: "coop",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 68,
    ready: true,
    maxPlayers: 8,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:coop_mission",
    infoTitle: "Co-op Mission",
    infoBody:
      "Mode cooperatif: objectifs communs (score cible, liste de cibles, sequence). Roles possibles (attaquant/finisher). Victoire si l'equipe reussit la mission dans le temps/nb de tours. A implementer.",
  },

  // 👹 BOSS BATTLE
  {
    id: "boss_battle",
    label: "Boss Battle",
    category: "fun",
    subCategory: "coop",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 69,
    ready: true,
    maxPlayers: 8,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:boss_battle",
    infoTitle: "Boss Battle",
    infoBody:
      "Un boss a des points de vie et des phases. Certaines zones sont vulnerables selon le round. Les joueurs cooperent pour le battre avant la fin du timer/du nombre de tours. A implementer.",
  },

  // ===========================================================
  // TRAINING (nouveaux drills a developper)
  // ===========================================================

  {
    id: "training_precision_gauntlet",
    label: "Precision Gauntlet",
    category: "training",
    subCategory: "precision",
    entry: "training",
    tab: "training",
    popularityRank: 120,
    ready: true,
    maxPlayers: 1,
    supportsTeams: false,
    supportsBots: false,
    statsKey: "training:precision_gauntlet",
    infoTitle: "Precision Gauntlet",
    infoBody:
      "Suite de cibles imposees. Tu avances uniquement en reussissant. Score possible: temps + penalites de miss. Excellent drill precision. A implementer.",
  },
  {
    id: "training_time_attack",
    label: "Time Attack",
    category: "training",
    subCategory: "performance",
    entry: "training",
    tab: "training",
    popularityRank: 121,
    ready: true,
    maxPlayers: 1,
    supportsTeams: false,
    supportsBots: false,
    statsKey: "training:time_attack",
    infoTitle: "Time Attack",
    infoBody:
      "Toucher une liste de cibles le plus vite possible. Miss = penalite temps. Classements locaux/online possibles. A implementer.",
  },
  {
    id: "training_repeat_master",
    label: "Repeat Master",
    category: "training",
    subCategory: "precision",
    entry: "training",
    tab: "training",
    popularityRank: 122,
    ready: true,
    maxPlayers: 1,
    supportsTeams: false,
    supportsBots: false,
    statsKey: "training:repeat_master",
    infoTitle: "Repeat Master",
    infoBody:
      "Objectif: toucher N fois de suite la meme cible (numero ou numero+multiplicateur). Echec reset la serie. Drill regularite + mental. A implementer.",
  },
  {
    id: "training_ghost",
    label: "Ghost Mode",
    category: "training",
    subCategory: "performance",
    entry: "training",
    tab: "training",
    popularityRank: 123,
    ready: true,
    maxPlayers: 1,
    supportsTeams: false,
    supportsBots: false,
    statsKey: "training:ghost",
    infoTitle: "Ghost Mode",
    infoBody:
      "Affronte ton meilleur score (ou une session enregistree) en parallele. Objectif: battre le 'fantome'. A implementer.",
  },

  // ===========================================================
  // EXPERIMENTAL / SIGNATURE (placeholders)
  // ===========================================================

  {
    id: "rpg_darts",
    label: "RPG Darts",
    category: "fun",
    subCategory: "experimental",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 70,
    ready: true,
    maxPlayers: 8,
    supportsTeams: true,
    supportsBots: true,
    statsKey: "game:rpg_darts",
    infoTitle: "RPG Darts",
    infoBody:
      "Meta-game avec progression: niveaux, competences, bonus passifs. Les matchs alimentent l'XP. Mode ultra addictif si persistance activee. A implementer.",
  },
  {
    id: "blind_darts",
    label: "Blind Darts",
    category: "fun",
    subCategory: "experimental",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 71,
    ready: true,
    maxPlayers: 8,
    supportsTeams: false,
    supportsBots: false,
    statsKey: "game:blind_darts",
    infoTitle: "Blind Darts",
    infoBody:
      "Mode 'a l'aveugle': la cible peut etre cachee partiellement, et/ou les instructions sont minimales. Variante fun pour la concentration. A implementer.",
  },
  {
    id: "sound_darts",
    label: "Sound Darts",
    category: "fun",
    subCategory: "experimental",
    entry: "games",
    tab: "mode_not_ready",
    popularityRank: 72,
    ready: true,
    maxPlayers: 8,
    supportsTeams: false,
    supportsBots: false,
    statsKey: "game:sound_darts",
    infoTitle: "Sound Darts",
    infoBody:
      "Mode guide par l'audio: la consigne de cible est annoncee. Reaction rapide, timer possible. A implementer.",
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
    ready: true,
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
    ready: true,
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
    ready: true,
    maxPlayers: 1,
    supportsTeams: false,
    supportsBots: false,
    statsKey: "training:super_bull",
    infoTitle: "Super Bull (Training)",
    infoBody:
      "Drill centre. Series de fleches, points Bull/DBull, objectifs progressifs. A implementer.",
  },
];

// ✅ Only expose the modes that are currently stable/functional.
// Everything else is shown as "À venir" (disabled) in the Games menu.
const READY_IDS = new Set<string>([
  "x01",
  "training_x01",
  "tour_horloge",
  "cricket",
  "killer",
  "shanghai",
  "golf",
  "departements",
  "bastard",
  "battle_royale",
  "warfare",
  "five_lives",
  "scram",
]);

export const dartsGameRegistry: DartsGameDef[] = rawDartsGameRegistry.map((g) => ({
  ...g,
  ready: READY_IDS.has(g.id),
}));

export default dartsGameRegistry;
export const DARTS_GAMES = dartsGameRegistry;

export const GAME_CATEGORIES: { id: GameCategory; label: string }[] = [
  { id: "classic", label: "Classiques" },
  { id: "variant", label: "Variantes" },
  { id: "challenge", label: "Defis" },
  { id: "fun", label: "Fun" },
  { id: "training", label: "Training" },
];

// Sous-categories (groupage visuel dans Games.tsx).
// On reste tolerant: si subCategory absent => groupe 'Autres'.
export const GAME_SUBCATEGORIES: Record<GameCategory, { id: string; label: string }[]> = {
  classic: [
    { id: 'classic', label: 'Classiques' },
  ],
  variant: [
    { id: 'x01', label: 'X01' },
    { id: 'cricket', label: 'Cricket' },
    { id: 'other', label: 'Autres variantes' },
  ],
  challenge: [
    { id: 'scoring', label: 'Scoring' },
    { id: 'precision', label: 'Precision' },
    { id: 'elimination', label: 'Elimination' },
    { id: 'other', label: 'Autres defis' },
  ],
  fun: [
    { id: 'arcade', label: 'Arcade' },
    { id: 'party', label: 'Party' },
    { id: 'battle', label: 'Duel' },
    { id: 'strategie', label: 'Strategie' },
    { id: 'survie', label: 'Survie' },
    { id: 'coop', label: 'Co-op' },
    { id: 'experimental', label: 'Experimental' },
    { id: 'other', label: 'Autres' },
  ],
  training: [
    { id: 'precision', label: 'Precision' },
    { id: 'performance', label: 'Performance' },
    { id: 'other', label: 'Autres drills' },
  ],
};


export function sortByPopularity(a: DartsGameDef, b: DartsGameDef) {
  const ar = a.popularityRank ?? 9999;
  const br = b.popularityRank ?? 9999;
  if (ar !== br) return ar - br;
  return a.label.localeCompare(b.label, "fr");
}