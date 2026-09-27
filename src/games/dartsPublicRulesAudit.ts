export type PublicRuleAudit = { status: 'available'|'development'; sources: string[]; options: string[] };

export const DARTS_PUBLIC_RULE_AUDIT: Record<string, PublicRuleAudit> = {
  "un_deux_trois_soleil": {
    "status": 'available',
    "sources": ["src/pages/Wave61SharedConfig.tsx", "src/pages/Wave61SharedPlay.tsx", "src/lib/gameEngines/wave61Engine.ts", "src/games/dartsWave61Families.ts", "src/games/dartsWave61.ts"],
    "options": [
      "OBJECTIF : atteindre 100 pas de progression",
      "ROUNDS : 16 par défaut",
      "Le jeu alterne des phases de déplacement et des phases SOLEIL / STOP",
      "PHASE VERTE : le moteur demande un secteur ; toucher ce numéro permet d’avancer",
      "Progression en phase verte : Simple = +4 pas, Double = +8, Triple = +12 ; les valeurs Bull prévues par le moteur sont +6 / +10 lorsqu’elles s’appliquent",
      "PHASE STOP : MISS signifie rester immobile ; Bull/DBULL sécurisent également l’immobilité",
      "En STOP, toute autre touche est considérée comme un mouvement et fait reculer",
      "PÉNALITÉ PAR MOUVEMENT : -5 pas en Facile, -8 en Normal, -12 en Difficile",
      "STOP PARFAIT : si aucun mouvement n’est détecté, le joueur peut gagner +3 pas",
      "Le moteur comptabilise les fautes/chutes de chaque joueur",
      "VICTOIRE : immédiate dès qu’un joueur atteint 100 pas",
      "BOTS IA, difficulté, ordre aléatoire et saisie Keypad / Cible interactive sont disponibles"
    ]
  },
  "hi_score": {
    "status": 'available',
    "sources": ["src/pages/Wave61SharedConfig.tsx", "src/pages/Wave61SharedPlay.tsx", "src/lib/gameEngines/wave61Engine.ts", "src/games/dartsWave61Families.ts", "src/games/dartsWave61.ts"],
    "options": [
      "BUT : réaliser le plus gros total de points",
      "ROUNDS : 10 par défaut ; le nombre de rounds est configurable dans le socle Wave61",
      "Chaque fléchette conserve sa valeur réelle ; le score de la volée est ajouté intégralement au total",
      "Il n’y a pas de cible imposée : le joueur cherche simplement le meilleur scoring possible",
      "À la fin du nombre de rounds configuré, le moteur classe les joueurs selon leur score total",
      "BOTS IA : ils privilégient notamment le 20 selon leur niveau",
      "DIFFICULTÉ IA : Facile / Normal / Difficile",
      "ORDRE ALÉATOIRE et saisie Keypad / Cible interactive sont configurables"
    ]
  },
  "green_vs_red": {
    "status": 'available',
    "sources": ["src/pages/Wave61SharedConfig.tsx", "src/pages/Wave61SharedPlay.tsx", "src/lib/gameEngines/wave61Engine.ts", "src/games/dartsWave61Families.ts", "src/games/dartsWave61.ts"],
    "options": [
      "Chaque joueur reçoit une piste ROUGE ou VERTE",
      "La progression se fait uniquement sur les anneaux DOUBLE ou TRIPLE du secteur actuellement demandé",
      "DOUBLE sur la bonne cible : +1 étape",
      "TRIPLE sur la bonne cible : +2 étapes",
      "Toucher avec D/T un numéro appartenant à la piste de la couleur adverse peut faire avancer l’adversaire suivant de +1 étape",
      "OBJECTIF FIXE DU MOTEUR : terminer les 10 étapes de sa piste",
      "Le score interne ajoute 40 points par étape gagnée",
      "En mode équipes, la couleur est attribuée selon le camp ; la victoire peut être rattachée à l’équipe",
      "Le moteur exige au moins 2 participants",
      "BOTS IA, difficulté, ordre aléatoire et saisie Keypad / Cible interactive sont disponibles"
    ]
  },
  "shove_a_penny": {
    "status": 'available',
    "sources": ["src/pages/Wave61SharedConfig.tsx", "src/pages/Wave61SharedPlay.tsx", "src/lib/gameEngines/wave61Engine.ts", "src/games/dartsWave61Families.ts", "src/games/dartsWave61.ts"],
    "options": [
      "CIBLES : 15 / 16 / 17 / 18 / 19 / 20 + BULL",
      "OBJECTIF : obtenir 3 marques sur chacune des 7 cibles, soit 21 marques",
      "Simple = 1 marque ; Double = 2 ; Triple = 3",
      "Bull 25 = 1 marque ; DBULL 50 = 2 marques",
      "Les marques servent d’abord à compléter sa propre cible jusqu’à 3",
      "SURPLUS : toute marque dépassant 3 est poussée vers l’adversaire suivant, dans la limite de ce qu’il lui manque sur cette même cible",
      "Le moteur ajoute 25 points par marque réellement gagnée par le joueur",
      "VICTOIRE : immédiate dès que les 21 marques personnelles sont complétées",
      "Le moteur exige au moins 2 participants",
      "BOTS IA, difficulté et saisie Keypad / Cible interactive sont pris en charge"
    ]
  },
  "nine_dart_century": {
    "status": 'available',
    "sources": ["src/pages/Wave61SharedConfig.tsx", "src/pages/Wave61SharedPlay.tsx", "src/lib/gameEngines/wave61Engine.ts", "src/games/dartsWave61Families.ts", "src/games/dartsWave61.ts"],
    "options": [
      "OBJECTIF FIXE : atteindre exactement 100 points",
      "VOLUME FIXE : 3 volées, soit 9 fléchettes maximum",
      "Chaque volée ajoute normalement la valeur réelle des fléchettes au total",
      "BUST : si le total projeté dépasse 100, la volée n’ajoute aucun point",
      "100 EXACT : victoire immédiate",
      "Le moteur comptabilise le nombre de busts par joueur",
      "BOTS IA, difficulté Facile / Normal / Difficile, ordre aléatoire et saisie Keypad / Cible interactive sont disponibles via Wave61"
    ]
  },
  "double_down": {
    "status": 'available',
    "sources": ["src/pages/Wave61SharedConfig.tsx", "src/pages/Wave61SharedPlay.tsx", "src/lib/gameEngines/wave61Engine.ts", "src/games/dartsWave61Families.ts", "src/games/dartsWave61.ts"],
    "options": [
      "PARCOURS FIXE DE 9 ROUNDS : 15 → 16 → n’importe quel DOUBLE → 17 → 18 → n’importe quel TRIPLE → 19 → 20 → BULL/DBULL",
      "Le mode impose 9 rounds dans la configuration actuelle",
      "À chaque round, seules les fléchettes qui respectent le contrat du round comptent",
      "Sur un round numérique, Simple / Double / Triple du numéro demandé sont valides et conservent leur valeur réelle",
      "Round DOUBLE : seuls les doubles sont valides ; DBULL est également accepté comme double",
      "Round TRIPLE : seuls les triples sont valides",
      "Round BULL : Bull 25 et DBULL 50 sont valides",
      "Si aucune fléchette ne valide le contrat du round, le score cumulé du joueur est divisé par deux, arrondi à l’entier inférieur",
      "Si le contrat est réussi, la valeur réelle des touches valides est ajoutée au score",
      "BOTS IA, difficulté Facile / Normal / Difficile, ordre aléatoire et saisie Keypad / Cible interactive sont gérés par le socle Wave61"
    ]
  },
  "knockback": {
    "status": 'available',
    "sources": ["src/pages/Wave61SharedConfig.tsx", "src/pages/Wave61SharedPlay.tsx", "src/lib/gameEngines/wave61Engine.ts", "src/games/dartsWave61Families.ts", "src/games/dartsWave61.ts"],
    "options": [
      "FAMILLE MOTEUR ACTUELLE : COMBAT",
      "OBJECTIF MOTEUR PAR DÉFAUT : 301",
      "NOMBRE DE ROUNDS PAR DÉFAUT : 25 ; la configuration Wave61 autorise 1 à 60 rounds",
      "DIFFICULTÉ : Facile / Normal / Difficile",
      "PARTICIPANTS : le moteur Combat impose au moins 2 participants",
      "BOTS IA : compatibles ; niveau Facile / Normal / Difficile",
      "ORDRE ALÉATOIRE : activable",
      "SAISIE : Keypad / Cible interactive",
      "À CHAQUE VOLÉE : le score réel des fléchettes est enregistré",
      "ATTAQUE : puissance = 10 points par hit validé + partie entière du score de volée / 12",
      "CIBLE DE L'ATTAQUE : un adversaire encore actif est choisi par le moteur ; en équipes, un adversaire du camp opposé",
      "DÉGÂTS : les points de vie de la cible sont diminués du montant de l'attaque",
      "K.O. : un adversaire à 0 PV est éliminé",
      "FIN COMBAT : en individuel, le dernier joueur encore actif gagne ; en équipes, la dernière équipe encore active gagne",
      "Sauvegarde/reprise, Undo, scoring par dart et écran de fin : gérés par le socle Wave61"
    ]
  },
  "replicat": {
    "status": 'available',
    "sources": ["src/pages/Wave61SharedConfig.tsx", "src/pages/Wave61SharedPlay.tsx", "src/lib/gameEngines/wave61Engine.ts", "src/games/dartsWave61Families.ts", "src/games/dartsWave61.ts"],
    "options": [
      "BUT : reproduire la volée de référence précédente, fléchette par fléchette et dans le même ordre",
      "PREMIÈRE VOLÉE : elle crée la séquence de référence ; elle n'accorde aucun point de copie",
      "FACILE : le même numéro suffit ; Simple / Double / Triple ne doivent pas forcément être identiques",
      "NORMAL : chaque segment doit être identique à la référence",
      "DIFFICILE : toute la séquence doit être parfaite ; une copie partielle ne valide aucune progression",
      "BULL : Bull 25 et DBULL 50 sont considérés comme le même numéro en difficulté Facile",
      "PROGRESSION : +1 par fléchette correctement reproduite en Facile/Normal ; en Difficile la progression n'est accordée que si toute la séquence est correcte",
      "SCORE : 100 points par validation de progression + bonus de 50 points lorsque toute la séquence est reproduite",
      "OBJECTIF PAR DÉFAUT : 9 copies validées",
      "NOMBRE DE ROUNDS PAR DÉFAUT : 12",
      "DIFFICULTÉ : Facile / Normal / Difficile",
      "BOTS IA : compatibles ; ils tentent de reproduire la séquence selon leur niveau",
      "SAISIE : Keypad / Cible interactive",
      "ORDRE ALÉATOIRE : activable",
      "FIN : victoire immédiate lorsqu'un joueur atteint l'objectif de progression configuré"
    ]
  },

  "heist_180": {
    "status": 'available',
    "sources": ["src/pages/Wave61SharedConfig.tsx", "src/pages/Wave61SharedPlay.tsx", "src/lib/gameEngines/wave61Engine.ts", "src/games/dartsWave61.ts"],
    "options": [
      "MOTEUR : famille Mission du socle Wave61",
      "DIFFICULTÉ : Facile / Normal / Difficile",
      "NOMBRE DE ROUNDS : réglable de 1 à 60",
      "JOUEURS ou 2 ÉQUIPES AUTO",
      "BOTS IA : ajout possible + niveau Facile / Normal / Difficile",
      "ORDRE ALÉATOIRE : activable",
      "SAISIE : Keypad / Cible interactive",
      "Concept actuel : préparer le casse, ouvrir le coffre, accumuler le butin puis réussir l’évasion avant que l’alarme ne devienne incontrôlable",
      "Sauvegarde/reprise, Undo, scoring par dart et écran de fin via le socle Wave61"
    ]
  },

  "demineur": {
    "status": 'available',
    "sources": ["src/pages/Wave61SharedConfig.tsx", "src/pages/Wave61SharedPlay.tsx", "src/lib/gameEngines/wave61Engine.ts", "src/games/dartsWave61Families.ts"],
    "options": [
      "GRILLE : secteurs 1 à 20 organisés en grille 5 × 4",
      "DIFFICULTÉ : Facile / Normal / Difficile",
      "NOMBRE DE ROUNDS : valeur par défaut 16, réglable de 1 à 60",
      "OBJECTIF MOTEUR : valeur par défaut 15",
      "Vies et élimination gérées par le moteur DÉMINEUR",
      "BULL : scanne une case sûre",
      "DBULL : scanne deux cases sûres",
      "Les cases sûres donnent des indices sur les mines voisines",
      "Victoire lorsque toutes les cases sûres sont révélées ; classement selon les cases sûres révélées",
      "JOUEURS ou 2 ÉQUIPES AUTO lorsque le mode équipes est sélectionné",
      "BOTS IA : ajout possible + niveau Facile / Normal / Difficile",
      "ORDRE ALÉATOIRE : activable",
      "SAISIE : Keypad / Cible interactive",
      "Sauvegarde/reprise, Undo et écran de fin via le socle Wave61"
    ]
  },

  "challenge": {
    "status": 'available',
    "sources": ["src/pages/ChallengeConfig.tsx", "src/pages/ChallengePlay.tsx"],
    "options": [
      "CIBLE : 1 à 20 ou BULL",
      "NOMBRE DE VOLÉES : 5, 10, 15, 20, 30, 50 ou 100",
      "OBJECTIF : TOUS LES HITS / SEULEMENT SIMPLE / SEULEMENT DOUBLE / SEULEMENT TRIPLE / SEULEMENT BULL 25 / SEULEMENT BULL 50",
      "3 fléchettes par volée",
      "S = 1 point, D = 2 points, T = 3 points ; BULL 25 = 1 point, DBULL 50 = 2 points",
      "Toute touche hors objectif = MISS / 0 point"
    ]
  },

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
    "sources": ["src/pages/CricketConfig.tsx", "src/pages/CricketPlay.tsx", "src/pages/CricketBoard.tsx"],
    "options": [
      "PARTICIPANTS : mode solo de 2 à 4 joueurs",
      "ÉQUIPES : mode 2 contre 2 avec 4 joueurs",
      "MODE DE SCORE : AVEC POINTS / SANS POINTS",
      "CIBLES : secteurs Cricket 15 / 16 / 17 / 18 / 19 / 20 + Bull",
      "FERMETURE : 3 marques ferment une cible pour le joueur ou l'équipe",
      "PREMIER JOUEUR : rotation possible à chaque nouvelle manche",
      "ORDRE DE DÉPART : sélectionné ou configurable dans l'écran Cricket",
      "BOTS : intégrés à la liste des participants par la configuration Cricket"
    ]
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
    "sources": ["src/pages/ShanghaiConfig.tsx", "src/pages/ShanghaiPlay.tsx", "src/pages/ShanghaiEnd.tsx"],
    "options": [
      "TOURS : 10 / 15 / 20",
      "ORDRE DES CIBLES : Chronologique / Aléatoire",
      "ORDRE ALÉATOIRE : calculé au lancement puis conservé pendant la partie",
      "SCORING SUR LA CIBLE DU TOUR : Simple = 1× le numéro, Double = 2×, Triple = 3×",
      "HORS CIBLE DU TOUR : 0 point",
      "SHANGHAI : Simple + Double + Triple de la cible dans le même tour",
      "VICTOIRE : SHANGHAI immédiat ou points en fin de partie",
      "VARIANTE : Points seulement, sans victoire immédiate par Shanghai",
      "PARTICIPANTS : au moins 2 joueurs ; multi et équipes pris en charge par la configuration",
      "BOTS IA : disponibles via la sélection de profils/bots"
    ]
  },
  "battle_royale": {
    "status": 'available',
    "sources": ["src/pages/BattleRoyaleConfig.tsx", "src/pages/BattleRoyalePlay.tsx"],
    "options": [
      "OBJECTIF : survivre ; le dernier joueur encore en jeu remporte la partie",
      "PARTICIPANTS : au moins 2 joueurs",
      "BOTS IA : ajout possible depuis la configuration",
      "RÈGLE D'ÉLIMINATION : 0 point = éliminé",
      "RÈGLE D'ÉLIMINATION : X ratés = éliminé — option affichée dans la configuration",
      "RÈGLE D'ÉLIMINATION : système de vies",
      "VIES : réglables de 1 à 9",
      "FLÉCHETTES PAR TOUR : 1 / 2 / 3",
      "ROUND : une cible ou consigne est affichée ; le joueur doit la réussir pendant son tour",
      "ÉCHEC : perte de vie(s) ou élimination selon la règle sélectionnée",
      "BRUITAGES : ON / OFF",
      "VOIX IA : ON / OFF",
      "FIN : les rounds continuent jusqu'au dernier survivant"
    ]
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
    "sources": ["src/pages/GolfConfig.tsx", "src/pages/GolfPlay.tsx", "src/pages/StatsGolfMatch.tsx"],
    "options": [
      "FORMAT : parcours de 9 ou 18 trous",
      "CIBLE DU TROU : un numéro est imposé à chaque trou",
      "ORDRE DES TROUS : Chronologique ou Aléatoire ; l'ordre aléatoire reste stable pendant toute la partie",
      "VOLÉE : jusqu'à 3 fléchettes par joueur et par trou ; le joueur peut s'arrêter avant",
      "SCORE DU TROU : seule la DERNIÈRE fléchette lancée pendant le tour détermine le score du trou",
      "BARÈME GOLF : le moteur convertit la dernière touche en score de trou ; l'objectif global est de terminer avec le total le plus bas",
      "PARTICIPANTS : au moins 2 joueurs pour lancer une partie",
      "ÉQUIPES : activables avec 2 / 3 / 4 équipes et assignation des joueurs",
      "BOTS IA : activables ; bots intégrés et bots personnalisés pris en charge",
      "NIVEAU BOT : Facile / Normal / Difficile",
      "ORDRE DE DÉPART : configurable pour les joueurs ou les équipes",
      "SAUVEGARDE / REPRISE : l'ordre exact des trous, les scores, le trou courant et l'état de fin sont restaurés",
      "FIN : après le dernier trou, classement au score total ; le score le plus bas gagne"
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
    "sources": ["src/pages/EnculetteConfig.tsx", "src/pages/EnculettePlay.tsx", "src/pages/SimpleRoundsConfig.tsx", "src/pages/SimpleRoundsPlay.tsx", "src/lib/simpleRounds/variants.ts"],
    "options": [
      "PRINCIPE : chaque volée ajoute son total au score cumulé",
      "PÉNALITÉ : une volée exactement égale à 0 applique -50 points",
      "ROUNDS DISPONIBLES : 5 / 8 / 10 / 12 / 15",
      "OBJECTIF : aucun / 100 / 200 / 300 / 500 / 1000",
      "OBJECTIF ACTIF : victoire immédiate dès que le score atteint ou dépasse l'objectif",
      "SANS OBJECTIF : le meilleur score après le dernier round gagne",
      "CONFIGURATION PAR DÉFAUT : 10 rounds, aucun objectif",
      "BOTS : activables dans le socle SimpleRounds",
      "NIVEAU BOT : Facile / Normal / Difficile"
    ]
  },
  "cricket_cut_throat": {
    "status": 'available',
    "sources": ["src/pages/CricketConfig.tsx", "src/pages/CricketPlay.tsx", "src/lib/cricketEngine.ts"],
    "options": [
      "CIBLES : 15 / 16 / 17 / 18 / 19 / 20 + BULL",
      "MARQUES : Simple = 1, Double = 2, Triple = 3 ; Bull = 1 et DBULL = 2",
      "FERMETURE : 3 marques ferment le secteur",
      "MODE CUT-THROAT : les points excédentaires ne gonflent pas le score du tireur ; ils sont infligés aux adversaires qui n'ont pas encore fermé le secteur",
      "Le moteur enregistre séparément les points infligés aux adversaires",
      "OBJECTIF : fermer toutes ses cibles avec le total de points le plus faible selon la logique Cut-Throat du moteur",
      "PARTICIPANTS, équipes et bots : gérés par la configuration Cricket"
    ]
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
    "status": 'available',
    "sources": ["src/pages/FunGagesConfig.tsx", "src/pages/FunGagesPlay.tsx"],
    "options": [
      "MODE STANDALONE JOUABLE : une partie Gages peut être lancée indépendamment des autres modes",
      "NOMBRE DE JOUEURS : 1 / 2 / 3 / 4 / 5 / 6 / 8 / 10 / 12",
      "TOUR PAR JOUEUR : OUI / NON",
      "OUI : après chaque tirage de gage, le tour passe automatiquement au joueur suivant",
      "NON : les boutons Précédent / Suivant permettent de choisir manuellement le joueur",
      "ACTION : le bouton TIRER UN GAGE sélectionne aléatoirement un gage dans la liste intégrée",
      "HISTORIQUE : conservation à l'écran des 30 derniers gages tirés avec le joueur concerné",
      "GAGES ACTUELS : défis de jeu, main non dominante, contraintes de parole, défis physiques ou sociaux et variantes autour du Bull",
      "LIMITATION ACTUELLE : le déclenchement automatique depuis les événements d'autres modes (Bust, 180, Bull...) est annoncé dans le code mais n'est pas encore branché"
    ]
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
    "sources": ["src/training/modes/precision/PrecisionConfig.tsx", "src/training/modes/precision/PrecisionGauntletPlay.tsx"],
    "options": [
      "PARCOURS STANDARD : S20 • S19 • S18 • S17 • S16 • BULL",
      "PARCOURS PRO : T20 • T19 • D18 • T17 • D16 • DBULL",
      "PARCOURS FINISH : D20 • D16 • D10 • D8 • D4 • DBULL",
      "TOLÉRANCE : HARDCORE / STANDARD — 3 erreurs / RELAX — 6 erreurs",
      "Sélection de participants : solo, multi ou équipes"
    ]
  },
  "training_time_attack": {
    "status": 'available',
    "sources": ["src/training/modes/timeattack/TimeAttackConfig.tsx", "src/training/modes/timeattack/TimeAttackPlay.tsx"],
    "options": [
      "DURÉE : 30 / 60 / 120 secondes",
      "Même durée pour tous les participants",
      "Classement individuel puis moyenne d’équipe",
      "Sélection de participants : solo, multi ou équipes"
    ]
  },
  "training_repeat_master": {
    "status": 'available',
    "sources": ["src/training/modes/repeat/RepeatMasterConfig.tsx", "src/training/modes/repeat/RepeatMasterPlay.tsx"],
    "options": [
      "CIBLE : S20 / T20 / D20 / D16 / BULL / DBULL",
      "OBJECTIF : 5 / 10 / 15 / 20 touches consécutives",
      "MODE SOFT : erreur = série remise à zéro",
      "MODE HARDCORE : première erreur = fin de session",
      "LIMITE : 30 / 60 / 90 fléchettes",
      "Sélection de participants : solo, multi ou équipes"
    ]
  },
  "training_ghost": {
    "status": 'available',
    "sources": ["src/training/modes/ghost/GhostConfig.tsx", "src/training/modes/ghost/GhostModePlay.tsx"],
    "options": [
      "MOYENNE GHOST /3 : 45 / 60 / 75 / 90",
      "VOLUME : 10 / 20 / 30 volées",
      "Tous les participants affrontent le même Ghost",
      "Sélection de participants : solo, multi ou équipes"
    ]
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
    "sources": ["src/pages/TrainingX01Config.tsx", "src/pages/TrainingX01Play.tsx", "src/lib/TrainingX01Store.ts", "src/stats/trainingX01Stats.ts"],
    "options": [
      "SCORE DE DÉPART : 301 / 501 / 701 / 901",
      "SORTIE : SIMPLE OUT / DOUBLE OUT / MASTER OUT",
      "SAISIE VOCALE DU SCORE : ON / OFF",
      "PARTICIPANTS : Training solo / multi-joueurs / équipes",
      "La même configuration de score et de sortie est utilisée pour les participants de la session",
      "MODE : entraînement X01 dédié, distinct d'un match X01 classique",
      "STATISTIQUES : sauvegarde dédiée Training X01 et exploitation dans les statistiques d'entraînement"
    ]
  },
  "tour_horloge": {
    "status": 'available',
    "sources": ["src/pages/TourDeLHorlogeConfig.tsx", "src/pages/TourDeLHorlogePlay.tsx"],
    "options": [
      "CONFIGURATION ACTUELLE : l'écran dédié utilise la configuration par défaut du RoundTargetEngine",
      "Aucun choix de paramètre supplémentaire n'est actuellement exposé dans TourDeLHorlogeConfig",
      "Le déroulement jouable est pris en charge par TourDeLHorlogePlay / RoundTargetEngine",
      "La fiche publique n'ajoute volontairement aucun réglage absent du moteur actuel"
    ]
  },
  "training_doubleio": {
    "status": 'available',
    "sources": ["src/training/modes/double/DoubleIOConfig.tsx", "src/training/modes/double/DoubleInOutPlay.tsx"],
    "options": [
      "MODE : DOUBLE IN / DOUBLE OUT / DOUBLE IN + DOUBLE OUT",
      "VOLUME : 10 / 20 / 40 rounds",
      "Même volume pour tous les participants",
      "Sélection de participants : solo, multi ou équipes"
    ]
  },
  "training_challenges": {
    "status": 'available',
    "sources": ["src/training/modes/challenges/ChallengesConfig.tsx", "src/training/modes/challenges/ChallengesPlay.tsx"],
    "options": [
      "DÉFI : 3 DOUBLES / 9 FLÉCHETTES",
      "DÉFI : BULL → T20 → D20 en 12 fléchettes maximum",
      "DÉFI : CHECKOUT 40 / 3 FLÉCHETTES avec finition obligatoire sur un double",
      "Même défi pour tous les participants",
      "Sélection de participants : solo, multi ou équipes"
    ]
  },
  "training_super_bull": {
    "status": 'available',
    "sources": ["src/training/modes/superbull/SuperBullConfig.tsx", "src/training/modes/superbull/SuperBullPlay.tsx"],
    "options": [
      "OBJECTIF : 50 / 100 / 150 points",
      "LIMITE : 15 / 30 / 60 fléchettes",
      "BULL = 25 points ; DBULL = 50 points",
      "Même objectif et même limite pour tous les participants",
      "Sélection de participants : solo, multi ou équipes"
    ]
  }
} as any;
