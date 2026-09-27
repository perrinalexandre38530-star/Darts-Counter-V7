export type PublicRuleAudit = { status: 'available'|'development'; sources: string[]; options: string[] };

export const DARTS_PUBLIC_RULE_AUDIT: Record<string, PublicRuleAudit> = {
  "x01": {
    "status": 'available',
    "sources": [
      "src/pages/X01Setup.tsx"
    ],
    "options": [
      "Paramètres X01",
      "Score de départ",
      "Mode de sortie",
      "Simple",
      "Double",
      "Master",
      "Mode d’entrée",
      "Format du match",
      "Sets à gagner",
      "Ordre aléatoire au lancement",
      "Mode match officiel (serve alterné)",
      "Voix (TTS)",
      "Sons arcade",
      "Legs",
      "Sets",
      "Set i/N",
      "Leg j/N",
      "Aucun joueur sélectionné"
    ]
  },
  "cricket": {
    "status": 'available',
    "sources": [
      "src/games/dartsGameRegistry.ts"
    ],
    "options": []
  },
  "darts_poker": {
    "status": 'available',
    "sources": [
      "src/pages/DartsPokerConfig.tsx"
    ],
    "options": [
      "MARCHÉ",
      "MAIN",
      "POUVOIRS",
      "BULLS",
      "CLASSEMENT",
      "CONTRAT",
      "VICTOIRE",
      "TABLE DE JEU",
      "FORMAT DE PARTIE",
      "6 · Une par une",
      "POUVOIRS POKER",
      "SAISIE & CONFORT",
      "TABLE PRÊTE",
      "0 ?",
      "PRÉCÉDENT",
      "SUIVANT",
      "♠ LANCER LA PARTIE",
      "♠ DÉMARRER DARTS POKER"
    ]
  },
  "cargo": {
    "status": 'available',
    "sources": [
      "src/pages/CargoConfig.tsx"
    ],
    "options": [
      "CONTRATS",
      "CAMION",
      "SÉRIES",
      "RISQUES",
      "COLIS",
      "ÉQUIPE DE TRANSPORT",
      "MULTI CARGO",
      "1 à 12 joueurs · humains et bots mélangés",
      "COMPOSITION DES ÉQUIPES",
      "2 à 4 équipes · ordre de jeu entrelacé automatiquement",
      "ÉQUILIBRER",
      "Chaque équipe doit contenir au moins un joueur.",
      "✓ Équipes prêtes · les coéquipiers seront alternés dans l’ordre de jeu.",
      "MISSION LOGISTIQUE",
      "SÉRIES & RISQUE",
      "CARGAISON PRÊTE",
      "CONFIGURATION GUIDÉE",
      "CONFIGURATION COMPLÈTE"
    ]
  },
  "killer": {
    "status": 'available',
    "sources": [
      "src/pages/KillerConfig.tsx"
    ],
    "options": [
      "& Record",
      "Profils",
      "2 joueurs",
      "Ordre de départ",
      "Règles verrouillées",
      "Attribution des numéros",
      "Vies de départ",
      "Vies identiques pour tous les joueurs.",
      "Règle pour devenir KILLER",
      "Dégâts quand on est KILLER",
      "Quand tu touches le numéro d’un adversaire vivant.",
      "Fonctions BULL",
      "Fonctions DBULL",
      "Vies données au ressuscité",
      "exclusives",
      "Objectif",
      "Être le dernier joueur encore vivant.",
      "1. Attribution des numéros"
    ]
  },
  "shanghai": {
    "status": 'available',
    "sources": [
      "src/games/dartsGameRegistry.ts"
    ],
    "options": []
  },
  "battle_royale": {
    "status": 'available',
    "sources": [
      "src/games/dartsGameRegistry.ts"
    ],
    "options": []
  },
  "warfare": {
    "status": 'available',
    "sources": [
      "src/pages/WarfareConfig.tsx"
    ],
    "options": [
      "../i18n/legacyLocalizedText",
      "../lib/bots",
      "../assets/tickers/ticker_warfare.png",
      "SINGLE_DOUBLE",
      "DOUBLE_ONLY",
      "TOP_BOTTOM",
      "BOT",
      ": theme.borderSoft}`, background: active ? theme.primary +",
      "BOTTOM",
      "Ajoute au moins 1 joueur",
      "Sélectionner des joueurs",
      "common.bots",
      "Bots IA",
      "common.noBots",
      "Aucun bot créé.",
      "Un joueur choisi dans une armée disparaît de l’autre carrousel.",
      "Joueur",
      "warfare.army.bottom"
    ]
  },
  "five_lives": {
    "status": 'available',
    "sources": [
      "src/pages/FiveLivesConfig.tsx"
    ],
    "options": [
      "Profils",
      "2 joueurs",
      "Vies de départ",
      "Vies identiques pour tous les joueurs.",
      "Ordre de départ",
      "Mode de saisie",
      "But :",
      "Principe :",
      "chaque joueur commence avec",
      "3 fléchettes",
      ". Tu dois faire un score",
      "STRICTEMENT supérieur",
      "Échec :",
      "si ton score est",
      "au score à battre, tu perds",
      "1 vie",
      "Élimination :",
      "0 vie"
    ]
  },
  "gros_6": {
    "status": 'available',
    "sources": [
      "src/pages/Gros6Config.tsx"
    ],
    "options": [
      "Joueurs retenus",
      "!Array.isArray(team.players) || team.players.length",
      "Équipes enregistrées",
      "Aucune équipe Darts enregistrée.",
      "Équipes BOTS IA",
      "Affectation manuelle",
      "Équipes",
      "Joueurs / équipe",
      "GÉNÉRER / REBRASSER",
      "Joueurs",
      "Duel ou multi-joueurs.",
      "Manuel, enregistré, IA ou brassage auto.",
      "Source des équipes",
      "Vies de départ",
      "Gestion des vies par équipes",
      "Validation de la cible",
      "Bull",
      "Cible imposable"
    ]
  },
  "golf": {
    "status": 'available',
    "sources": [
      "src/pages/GolfConfig.tsx"
    ],
    "options": [
      "Assignation",
      "../lib/botCountries",
      "../lib/bots",
      "../components/BotPagedSelector",
      "../assets/tickers/ticker_golf.png",
      "../ui_assets/teams/team_gold.png",
      "../ui_assets/teams/team_pink.png",
      "../ui_assets/teams/team_blue.png",
      "../ui_assets/teams/team_green.png",
      "../assets/avatars/bots-pro/green-machine.png",
      "../assets/avatars/bots-pro/jackpot.png",
      "../assets/avatars/bots-pro/crafty-cockney.png",
      "../assets/avatars/bots-pro/barney.png",
      "../assets/avatars/bots-pro/the-menace.png",
      "../assets/avatars/bots-pro/darth-maple.png",
      "../assets/avatars/bots-pro/the-giant.png",
      "../assets/avatars/bots-pro/the-hammer.png",
      "../assets/avatars/bots-pro/voltage.png"
    ]
  },
  "scram": {
    "status": 'available',
    "sources": [
      "src/pages/ScramConfig.tsx"
    ],
    "options": [
      "SOLO OU ÉQUIPES",
      "Joueurs",
      "Équipes",
      "BUT DU JEU",
      "bloque",
      "les cibles pendant que l’autre",
      "marque des points",
      "PHASE 1",
      "PHASE 2",
      "VICTOIRE",
      "SAISIE",
      "keypad",
      "ou la",
      "cible interactive",
      "../components/BotPagedSelector",
      "../lib/bots",
      "../lib/scoreInput/types",
      "../assets/tickers/ticker_scram.png"
    ]
  },
  "enculette": {
    "status": 'available',
    "sources": [],
    "options": []
  },
  "cricket_cut_throat": {
    "status": 'available',
    "sources": [],
    "options": []
  },
  "killer_progressive": {
    "status": 'available',
    "sources": [
      "src/pages/KillerConfig.tsx"
    ],
    "options": [
      "& Record",
      "Profils",
      "2 joueurs",
      "Ordre de départ",
      "Règles verrouillées",
      "Attribution des numéros",
      "Vies de départ",
      "Vies identiques pour tous les joueurs.",
      "Règle pour devenir KILLER",
      "Dégâts quand on est KILLER",
      "Quand tu touches le numéro d’un adversaire vivant.",
      "Fonctions BULL",
      "Fonctions DBULL",
      "Vies données au ressuscité",
      "exclusives",
      "Objectif",
      "Être le dernier joueur encore vivant.",
      "1. Attribution des numéros"
    ]
  },
  "super_bull": {
    "status": 'available',
    "sources": [
      "src/pages/SuperBullConfig.tsx"
    ],
    "options": [
      "./SimpleRoundsConfig",
      "../lib/simpleRounds/types",
      "super_bull",
      "super_bull_play"
    ]
  },
  "happy_mille": {
    "status": 'available',
    "sources": [
      "src/pages/HappyMilleConfig.tsx"
    ],
    "options": [
      "./SimpleRoundsConfig",
      "../lib/simpleRounds/types"
    ]
  },
  "v170": {
    "status": 'available',
    "sources": [
      "src/pages/Game170Config.tsx"
    ],
    "options": [
      "./SimpleRoundsConfig",
      "../lib/simpleRounds/types"
    ]
  },
  "count_up": {
    "status": 'available',
    "sources": [
      "src/pages/CountUpConfig.tsx"
    ],
    "options": [
      "./SimpleRoundsConfig",
      "../lib/simpleRounds/types"
    ]
  },
  "halve_it": {
    "status": 'available',
    "sources": [
      "src/pages/HalveItConfig.tsx"
    ],
    "options": [
      "OBJECTIF",
      "3 FLÉCHETTES",
      "HALVE-IT",
      "DÉPART",
      "VICTOIRE",
      "ÉQUIPES",
      "Participants",
      "1 à 12 profils. Même sélecteur de profils, sets de fléchettes, équipes et bots que X01.",
      "Bots IA",
      "GÉRER LES BOTS",
      "0 ?",
      "Parcours HALVE-IT",
      "Règles",
      "Saisie",
      "Résumé",
      "Départ",
      "Parcours",
      "Halve"
    ]
  },
  "bobs_27": {
    "status": 'available',
    "sources": [
      "src/pages/Bobs27Config.tsx"
    ],
    "options": [
      "OBJECTIF",
      "Bob’s 27 est un exercice de précision sur les doubles. Chaque joueur démarre à 27 points.",
      "ROTATION CLASSIQUE",
      "3 fléchettes sur D1, puis D2, D3… jusqu’à D20, puis DBULL.",
      "TOUCHE",
      "ZÉRO TOUCHE",
      "ÉLIMINATION",
      "ÉQUIPES",
      "Participants",
      "1 à 12 profils. Même sélecteur, sets de fléchettes et logique de profils que X01.",
      "Bots IA",
      "GÉRER LES BOTS",
      "0 ?",
      "Parcours des doubles",
      "Règles",
      "Saisie",
      "Résumé",
      "Départ"
    ]
  },
  "knockout": {
    "status": 'available',
    "sources": [
      "src/pages/KnockoutConfig.tsx"
    ],
    "options": [
      "../assets/tickers/ticker_knockout.png",
      "Joueurs",
      "Nombre de joueurs",
      "config.bots",
      "Bots IA",
      "config.botLevel",
      "Difficulté IA",
      "config.rounds",
      "Rounds",
      "Objectif"
    ]
  },
  "shooter": {
    "status": 'available',
    "sources": [
      "src/pages/ShooterConfig.tsx"
    ],
    "options": [
      "OBJECTIF",
      "MARKS",
      "POINTS",
      "PÉNALITÉ",
      "ÉQUIPES",
      "VICTOIRE",
      "Participants",
      "1 à 12 profils. Sélecteur, équipes et sets de fléchettes identiques à X01.",
      "Bots IA",
      "GÉRER LES BOTS",
      "0 ?",
      "Parcours de tir",
      "Le BULL est automatiquement désactivé en mode « Triple uniquement ».",
      "Règles & difficulté",
      "Saisie",
      "Résumé",
      "Parcours",
      "Zone"
    ]
  },
  "baseball": {
    "status": 'available',
    "sources": [
      "src/pages/BaseballConfig.tsx"
    ],
    "options": [
      "MODE CIBLES",
      "VARIANTE ATTAQUE / DÉFENSE",
      "MISS",
      "BULL / DBULL — JAMAIS",
      "Aucun effet spécial. En mode cibles, le BULL n’entre jamais dans la rotation par défaut.",
      "BULL — DÉFENSE",
      "BULL — ATTAQUE",
      "BULL ajoute le bonus configuré à son propre score. DBULL double son score courant.",
      "BULL DANS LE TIRAGE",
      "ÉQUIPES",
      "Participants",
      "Bots IA",
      "Gérer les BOTS",
      "Ajoute les mêmes BOTS IA prédéfinis ou personnels que dans X01.",
      "0 ?",
      "Format du match",
      "Définis la durée de la partie et le comportement des manches supplémentaires.",
      "Variante de jeu"
    ]
  },
  "attrape_moi": {
    "status": 'available',
    "sources": [
      "src/pages/AttrapeMoiConfig.tsx"
    ],
    "options": [
      "OBJECTIF",
      "FUYARD",
      "CHASSEUR",
      "ALTERNANCE",
      "SETS",
      "ÉQUIPES",
      "Participants",
      "Exactement 2 joueurs. Les rôles Fuyard / Chasseur s’inversent après chaque manche.",
      "Bots IA",
      "GÉRER LES BOTS",
      "0 ?",
      "Poursuite",
      "Format du match",
      "Format des manches",
      "Format des sets",
      "Sélection :",
      "manches / set ·",
      "sets / match. Les rôles s’inversent après chaque manche."
    ]
  },
  "president": {
    "status": 'available',
    "sources": [
      "src/pages/PresidentConfig.tsx"
    ],
    "options": [
      "OBJECTIF",
      "PLI",
      "HIÉRARCHIE",
      "TAXE",
      "CHAOS",
      "♛ PRÉSIDENT",
      "CIBLE À BATTRE",
      "D17",
      "PAIRE DE 17",
      "PARTICIPANTS",
      "BOTS IA",
      "FORMAT DU RÈGNE",
      "VARIANTE",
      "SAISIE",
      "La carte-cible reste affichée pendant la tentative. Exemple :",
      "D17 — PAIRE DE 17",
      ". Dès qu’une fléchette correspond exactement, la combinaison est validée.",
      "RÉSUMÉ"
    ]
  },
  "football": {
    "status": 'available',
    "sources": [
      "src/pages/FootballConfig.tsx"
    ],
    "options": [
      "PRINCIPE",
      "ATTAQUE",
      "DÉFENSE",
      "Simple repousse le ballon, Double intercepte, Triple déclenche une contre-attaque.",
      "TIR ET GARDIEN",
      "FORMATS",
      "CLASSIC",
      "ATTAQUE :",
      "DÉFENSE :",
      "CONFIGURATION GUIDÉE",
      "TOUS LES RÉGLAGES",
      "MODE",
      "FORMAT",
      "AFFICHE",
      "SAISIE",
      "SUIVANT →",
      "⚽ COUP D’ENVOI",
      "../components/BotPagedSelector"
    ]
  },
  "rugby": {
    "status": 'available',
    "sources": [
      "src/pages/RugbyConfig.tsx"
    ],
    "options": [
      "../assets/tickers/ticker_rugby.png",
      "Joueurs",
      "Nombre de joueurs",
      "config.bots",
      "Bots IA",
      "config.botLevel",
      "Difficulté IA",
      "config.rounds",
      "Rounds",
      "Objectif"
    ]
  },
  "capital": {
    "status": 'available',
    "sources": [
      "src/pages/CapitalConfig.tsx"
    ],
    "options": [
      "Configuration guidée",
      "Configuration complète",
      "ex. 500",
      "0 ?",
      "Précédent",
      "Suivant",
      "../assets/tickers/ticker_capital.png",
      "../lib/botsPro",
      "../lib/botsProAvatars",
      "../lib/bots",
      "../lib/scoreInput/types",
      "triple_any",
      "double_any",
      "Définit la précision générale des bots pendant leurs volées.",
      ", botSpeed:",
      ", botRisk:",
      ", preset:",
      "Triple (au moins un triple)"
    ]
  },
  "departements": {
    "status": 'available',
    "sources": [
      "src/pages/DepartementsConfig.tsx"
    ],
    "options": [
      "Configuration Territories",
      "Configuration guidée",
      "Bots IA",
      "count * teamSize",
      "3. Mode de jeu",
      "Choisis la philosophie de la partie puis sa durée.",
      "Conquête",
      "Carte neutre, capture directe.",
      "Forteresses",
      "Territoires partagés et défendables.",
      "4. Règles de jeu",
      "Le joueur peut toujours appuyer sur VALIDER après 1, 2 ou 3 fléchettes.",
      "5. Victoire & récapitulatif",
      "Carte",
      "Participants",
      "Mode",
      "Cible",
      "Victoire"
    ]
  },
  "darts_firefighter": {
    "status": 'available',
    "sources": [
      "src/pages/DartsFirefighterConfig.tsx"
    ],
    "options": [
      "OBJECTIF DE MISSION",
      "MISSION PRÉCONFIGURÉE",
      "PERSONNALISER",
      "OBJECTIF",
      "PUISSANCE D’EAU",
      "PROPAGATION",
      "BULL / DBULL",
      "BRIGADE",
      "value",
      "GLISSE HORIZONTALEMENT POUR VOIR TOUTES LES MISSIONS",
      "BOTS FIREFIGHTER",
      "CIBLES UNIQUES · AUCUN DOUBLON",
      "ATTRIBUTION AUTOMATIQUE",
      "0) ?",
      "0 ?",
      "⚠ Sélectionne au moins un pompier dans l’étape Brigade.",
      "CONFIGURATION FIREFIGHTER V4",
      "8 étapes · 4 scénarios · réglages avancés"
    ]
  },
  "loterie": {
    "status": 'available',
    "sources": [
      "src/pages/LoterieConfig.tsx"
    ],
    "options": [
      "LOTERIE — 3 FLÉCHETTES",
      "LOTERIE EXPRESS",
      "CARTONS",
      "VICTOIRE",
      "ÉQUIPES",
      "BOTS IA",
      "Participants",
      "1 à 12 profils. Même sélecteur de profils que X01.",
      "Bots IA",
      "Gérer les BOTS",
      "Choisis parmi les 7 BOTS IA officiels de LOTERIE ou ajoute tes BOTS CPU personnels.",
      "0 ?",
      "Les BOTS jouent automatiquement pendant la partie LOTERIE.",
      "Volée",
      ": le total de 1 à 3 fléchettes est recherché sur les cartons.",
      "EXPRESS",
      ": vise un Simple, Double ou Triple exact avec 1 essai ou jusqu'à 3 essais.",
      "Détermine le score maximum pouvant apparaître sur les cartons."
    ]
  },
  "fifty_one_by_five": {
    "status": 'available',
    "sources": [
      "src/pages/FiftyOneByFiveConfig.tsx"
    ],
    "options": [
      "OBJECTIF",
      "DIVISIBLE PAR 5",
      "VOLÉE VALIDE",
      "VICTOIRE",
      "./newModes/NewDartsModeConfig",
      "../assets/tickers/ticker_51_by_5.webp",
      "objectif gagne. Dépasser l"
    ]
  },
  "looper": {
    "status": 'available',
    "sources": [
      "src/pages/LooperConfig.tsx"
    ],
    "options": [
      "FOLLOW THE LEADER",
      "SEGMENT EXACT",
      "LOOPS",
      "VICTOIRE",
      "Le dernier joueur avec au moins une vie remporte la partie.",
      "./newModes/NewDartsModeConfig",
      "../assets/tickers/ticker_looper.webp"
    ]
  },
  "call_three": {
    "status": 'available',
    "sources": [
      "src/pages/CallThreeConfig.tsx"
    ],
    "options": [
      "3 CIBLES",
      "ORDRE STRICT",
      "POINTS",
      "VICTOIRE",
      "./newModes/NewDartsModeConfig",
      "../assets/tickers/ticker_call_three.webp"
    ]
  },
  "steeplechase": {
    "status": 'available',
    "sources": [
      "src/pages/SteeplechaseConfig.tsx"
    ],
    "options": [
      "COURSE",
      "ZONE INTÉRIEURE",
      "HAIES",
      "VICTOIRE",
      "Le premier joueur qui termine le parcours puis valide le Bull remporte la course.",
      "./newModes/NewDartsModeConfig",
      "../assets/tickers/ticker_steeplechase.webp",
      "ordre physique des secteurs jusqu",
      "arrivée au Bull.</div> <div><b style={{ color:",
      "anneau triple permet de franchir un secteur.</div> <div><b style={{ color:"
    ]
  },
  "pendu": {
    "status": 'available',
    "sources": [
      "src/pages/PenduConfig.tsx"
    ],
    "options": [
      "OBJECTIF",
      "DÉFI",
      "ERREUR",
      "VICTOIRE",
      "Le dernier joueur encore vivant remporte la partie.",
      "./newModes/NewDartsModeConfig",
      "../assets/tickers/ticker_pendu.webp"
    ]
  },
  "menteur": {
    "status": 'available',
    "sources": [
      "src/pages/MenteurConfig.tsx"
    ],
    "options": [
      "ENCHÈRES",
      "SURENCHÈRE",
      "RÉSOLUTION",
      "VICTOIRE",
      "Le dernier joueur ayant encore des vies gagne la partie.",
      "./newModes/NewDartsModeConfig",
      "../assets/tickers/ticker_menteur.webp"
    ]
  },
  "crados": {
    "status": 'available',
    "sources": [
      "src/pages/CradosConfig.tsx"
    ],
    "options": [
      "CONTAMINATION",
      "PIÈGES",
      "DOUCHE",
      "VICTOIRE",
      "Le dernier joueur encore sous la limite de crasse remporte la manche.",
      "MODE ÉQUIPES",
      "./newModes/NewDartsModeConfig",
      "../assets/tickers/ticker_crados.webp",
      "Mode"
    ]
  },
  "castle": {
    "status": 'available',
    "sources": [
      "src/pages/CastleConfig.tsx"
    ],
    "options": [
      "OBJECTIF",
      "Construis ton château avant les autres. La règle classique utilise 15 briques.",
      "NUMÉRO PERSONNEL",
      "ATTAQUE",
      "VICTOIRE",
      "Le premier à atteindre le nombre de briques demandé remporte la manche.",
      "./newModes/NewDartsModeConfig",
      "../assets/tickers/ticker_castle.webp"
    ]
  },
  "gotcha": {
    "status": 'available',
    "sources": [
      "src/pages/GotchaConfig.tsx"
    ],
    "options": [
      "OBJECTIF",
      "Pars de 0 et atteins exactement le score cible, classiquement 301.",
      "GOTCHA !",
      "Si ton total devient exactement égal au total d'un adversaire, son score est remis à 0.",
      "BUST",
      "SORTIE",
      "Straight, Double Out ou Master Out selon la configuration.",
      "./newModes/NewDartsModeConfig",
      "../assets/tickers/ticker_gotcha.webp",
      "un adversaire, son score est remis à 0.</div> <div><b style={{ color:"
    ]
  },
  "hare_hounds": {
    "status": 'available',
    "sources": [
      "src/pages/HareHoundsConfig.tsx"
    ],
    "options": [
      "POURSUITE",
      "DÉPLACEMENT",
      "LIÈVRE",
      "Il gagne s'il boucle un tour complet et revient à 20 avant d'être rattrapé.",
      "LIMIERS",
      "Ils gagnent en rattrapant ou dépassant le Lièvre selon la logique de poursuite.",
      "./newModes/NewDartsModeConfig",
      "../assets/tickers/ticker_hare_hounds.webp"
    ]
  },
  "prisoner": {
    "status": 'available',
    "sources": [
      "src/pages/PrisonerConfig.tsx"
    ],
    "options": [
      "OBJECTIF",
      "ZONE DE PROGRESSION",
      "PRISONNIER",
      "CAPTURE",
      "MISS HORS CIBLE",
      "ÉLIMINATION",
      "MODE ÉQUIPES",
      "Participants",
      "2 à 12 profils. Même sélecteur et mêmes sets de fléchettes que X01.",
      "Bots IA",
      "GÉRER LES BOTS",
      "0 ?",
      "Parcours",
      "Prisonniers & élimination",
      "Saisie",
      "Résumé",
      "Départ",
      "MISS"
    ]
  },
  "tic_tac_toe": {
    "status": 'available',
    "sources": [
      "src/pages/TicTacToeConfig.tsx"
    ],
    "options": [
      "../assets/tickers/ticker_tic_tac_toe.png",
      "Joueurs",
      "Nombre de joueurs",
      "config.bots",
      "Bots IA",
      "config.botLevel",
      "Difficulté IA",
      "config.rounds",
      "Rounds",
      "Objectif"
    ]
  },
  "bastard": {
    "status": 'available',
    "sources": [
      "src/pages/BatardConfig.tsx"
    ],
    "options": [
      "../assets-webp/tickers/ticker_bastard.webp",
      "Joueurs",
      "Nombre de joueurs",
      "config.bots",
      "Bots IA",
      "config.botLevel",
      "Difficulté IA",
      "config.rounds",
      "Rounds",
      "Objectif"
    ]
  },
  "fun_gages": {
    "status": 'development',
    "sources": [],
    "options": []
  },
  "bowling": {
    "status": 'available',
    "sources": [
      "src/pages/BowlingConfig.tsx"
    ],
    "options": [
      "OBJECTIF",
      "STRIKE",
      "SPARE",
      "BONUS",
      "CONVERSION DARTS → QUILLES",
      "SÉRIE",
      "Participants",
      "1 à 8 profils. Même sélecteur, sets de fléchettes et logique de profils que X01.",
      "Bots IA",
      "GÉRER LES BOTS",
      "0 ?",
      "Format",
      "Conversion Darts → Quilles",
      "Saisie",
      "Résumé",
      "Niveau",
      "Aides arcade",
      "Configuration Bowling"
    ]
  },
  "bingo": {
    "status": 'development',
    "sources": [],
    "options": []
  },
  "follow_the_leader": {
    "status": 'development',
    "sources": [],
    "options": []
  },
  "mario_kart": {
    "status": 'available',
    "sources": [
      "src/pages/DartsRacerConfig.tsx"
    ],
    "options": [
      "OBJECTIF",
      "VITESSE",
      "CASES ARCADE",
      "COLLISIONS",
      "TOURS & CIRCUIT",
      "VICTOIRE",
      "Participants",
      "1 à 12 profils. Sélecteur, équipes et sets de fléchettes identiques à X01.",
      "Bots IA",
      "GÉRER LES BOTS",
      "0 ?",
      "Circuit",
      "Distance totale :",
      ". Simple +1 · Double +2 · Triple +3 · BULL +4 · DBULL +5.",
      "Style & arcade",
      "Saisie",
      "Résumé",
      "Style"
    ]
  },
  "ocean_control": {
    "status": 'available',
    "sources": [
      "src/pages/OceanControlConfig.tsx"
    ],
    "options": [
      "OBJECTIF",
      "MODE TACTIQUE",
      "SONAR",
      "Le Bull analyse la zone sélectionnée et indique le nombre de contacts proches.",
      "DBULL",
      "VICTOIRE",
      "La première flotte à remporter le nombre de manches choisi prend le contrôle de l’océan.",
      "COMMANDANTS DE FLOTTE",
      "FORMAT DE LA FLOTTE",
      "SYSTÈMES D’ARMES",
      "PARAMÈTRES DE BATAILLE",
      "ORDRE DE MISSION",
      "CONFIGURATION GUIDÉE",
      "CONFIGURATION COMPLÈTE",
      "PRÉCÉDENT",
      "SUIVANT",
      "LANCER OCEAN CONTROL",
      "⚓ PRENDRE LE CONTRÔLE DE L’OCÉAN"
    ]
  },
  "conquest": {
    "status": 'development',
    "sources": [],
    "options": []
  },
  "domination": {
    "status": 'development',
    "sources": [],
    "options": []
  },
  "mines_traps": {
    "status": 'development',
    "sources": [],
    "options": []
  },
  "last_man_standing": {
    "status": 'development',
    "sources": [],
    "options": []
  },
  "bomb_countdown": {
    "status": 'development',
    "sources": [],
    "options": []
  },
  "infection": {
    "status": 'development',
    "sources": [],
    "options": []
  },
  "randomizer": {
    "status": 'development',
    "sources": [],
    "options": []
  },
  "casino": {
    "status": 'development',
    "sources": [],
    "options": []
  },
  "chaos_mode": {
    "status": 'development',
    "sources": [],
    "options": []
  },
  "coop_mission": {
    "status": 'development',
    "sources": [],
    "options": []
  },
  "boss_battle": {
    "status": 'development',
    "sources": [],
    "options": []
  },
  "training_precision_gauntlet": {
    "status": 'available',
    "sources": [],
    "options": []
  },
  "training_time_attack": {
    "status": 'available',
    "sources": [],
    "options": []
  },
  "training_repeat_master": {
    "status": 'available',
    "sources": [],
    "options": []
  },
  "training_ghost": {
    "status": 'available',
    "sources": [],
    "options": []
  },
  "rpg_darts": {
    "status": 'development',
    "sources": [],
    "options": []
  },
  "blind_darts": {
    "status": 'development',
    "sources": [],
    "options": []
  },
  "sound_darts": {
    "status": 'development',
    "sources": [],
    "options": []
  },
  "training_x01": {
    "status": 'available',
    "sources": [],
    "options": []
  },
  "tour_horloge": {
    "status": 'available',
    "sources": [],
    "options": []
  },
  "training_doubleio": {
    "status": 'available',
    "sources": [],
    "options": []
  },
  "training_challenges": {
    "status": 'available',
    "sources": [],
    "options": []
  },
  "training_super_bull": {
    "status": 'available',
    "sources": [],
    "options": []
  }
} as any;
