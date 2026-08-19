export type AwenaModeLike = {
  id: string;
  label: string;
  summary: string;
  configuration: string;
  victoryCondition: string;
  variants: string[];
  maxPlayers: number;
  supportsTeams: boolean;
  supportsBots: boolean;
  howToPlayInApp: string;
};

type Section = { title: string; body?: string; bullets?: string[]; note?: string };

type ModeDeepDetail = {
  rules?: Section[];
  configuration?: Section[];
};

const DEEP: Record<string, ModeDeepDetail> = {
  x01: {
    rules: [
      { title: "OBJECTIF", body: "Chaque joueur part du score choisi — 301, 501, 701 ou 901 — et soustrait le total de chaque volée. Il faut atteindre **exactement 0**." },
      { title: "ENTRÉE — IN", bullets: [
        "**Simple In** : la partie commence sur n’importe quelle touche valide.",
        "**Double In** : les points ne commencent à descendre qu’après un double.",
        "**Master In** : l’entrée est validée par un double ou un triple.",
      ] },
      { title: "SORTIE — OUT", bullets: [
        "**Simple Out** : n’importe quelle touche peut terminer la partie si elle amène exactement à 0.",
        "**Double Out** : la dernière fléchette doit être un double.",
        "**Master Out** : la dernière fléchette doit être un double ou un triple.",
      ] },
      { title: "BUST", body: "Si une volée rend la sortie invalide — par exemple score négatif ou finition interdite par le mode Out — la volée est annulée et le score revient à sa valeur du début de volée." },
      { title: "MATCH", body: "Les manches et les sets définissent la longueur du match. Selon la configuration, l’ordre de départ peut être défini ou aléatoire." },
    ],
    configuration: [
      { title: "SCORE DE DÉPART", bullets: ["301", "501", "701", "901"] },
      { title: "ENTRÉE / SORTIE", bullets: ["Simple In, Double In ou Master In.", "Simple Out, Double Out ou Master Out."] },
      { title: "PARTICIPANTS", body: "Choix des joueurs, des équipes lorsque le format l’autorise, et des bots IA. Les dartsets associés aux profils peuvent être utilisés." },
      { title: "FORMAT DU MATCH", body: "Réglage des manches et des sets selon les choix proposés à l’écran. Le format détermine combien de manches ou de sets sont nécessaires pour gagner." },
      { title: "ORDRE / AUDIO / SAISIE", body: "L’écran permet aussi de régler l’ordre de départ, les options de voix/annonces et le mode de comptage ou de saisie disponible." },
      { title: "CONDITION DE VICTOIRE", body: "Atteindre exactement 0 en respectant le mode de sortie sélectionné." },
    ],
  },

  attrape_moi: {
    rules: [
      { title: "OBJECTIF", body: "Le **Fuyard** commence avec une avance. Il doit rester devant jusqu’à la fin de la poursuite. Le **Chasseur** doit atteindre ou dépasser son score avant la limite." },
      { title: "FUYARD", body: "Il joue en premier à chaque round. Il gagne la manche par **ÉVASION** s’il atteint l’écart configuré, ou s’il n’est pas rattrapé à la fin du nombre maximum de rounds." },
      { title: "CHASSEUR", body: "Il joue après le Fuyard. Dès que son score cumulé atteint ou dépasse celui du Fuyard, la manche s’arrête immédiatement : **CAPTURE**." },
      { title: "ALTERNANCE", body: "Après chaque manche, les rôles s’inversent automatiquement : chaque camp devient successivement Fuyard puis Chasseur." },
      { title: "ÉQUIPES", body: "En équipes, tous les joueurs du camp Fuyard jouent d’abord leur volée, puis tous les joueurs du camp Chasseur. Le score est cumulé par camp, tout en conservant les statistiques individuelles." },
      { title: "FORMAT", body: "Les manches et les sets peuvent être configurés en **Best Of** ou **First To**." },
    ],
    configuration: [
      { title: "MODE DE CONFIGURATION", bullets: [
        "**Guidée** : configuration étape par étape : Participants, Poursuite, Format, Saisie, Résumé.",
        "**Complète** : tous les réglages sont visibles sur une seule page.",
      ] },
      { title: "PARTICIPANTS", bullets: [
        "**Joueurs** : exactement 2 joueurs ; les rôles Fuyard / Chasseur s’inversent après chaque manche.",
        "**Équipes** : 2 camps ; équipes manuelles, sauvegardées ou générées selon les choix disponibles.",
        "**Bots IA** : activables ; difficulté **Facile / Normal / Difficile**.",
      ] },
      { title: "POURSUITE", bullets: [
        "**Avance du Fuyard** : 50, 100, 150, 200, 250, 300, 400 ou 500 points.",
        "**Score d’évasion** : écart qui donne une évasion immédiate ; les choix vont jusqu’à 1000 points et doivent rester supérieurs à l’avance initiale.",
        "**Rounds max / manche** : 3, 5, 7, 10, 12, 15 ou 20 rounds.",
        "**Premier Fuyard** : 1er camp sélectionné, 2e camp sélectionné ou tirage aléatoire.",
      ], note: "Départ : Fuyard avec l’avance choisie, Chasseur à 0. Capture à 0 d’écart. Évasion immédiate lorsque l’écart configuré est atteint." },
      { title: "FORMAT DES MANCHES", bullets: [
        "**Best Of** : 1, 3, 5, 7, 9, 11, 13 ou 15 manches.",
        "**First To** : 1, 3, 5, 7, 9, 10, 11, 13, 15, 16, 17 ou 18 manches à gagner.",
      ] },
      { title: "FORMAT DES SETS", bullets: [
        "**Best Of** ou **First To**.",
        "Valeurs proposées : 1, 3, 5, 7, 9, 11 ou 13.",
      ] },
      { title: "SAISIE", bullets: [
        "**Keypad X01**.",
        "**Cible interactive**.",
        "Les impacts Simple, Double, Triple, Bull, Double Bull et Miss sont conservés pour l’historique et les statistiques Fuyard / Chasseur.",
      ] },
      { title: "CONDITION DE VICTOIRE", body: "Une manche est gagnée par **CAPTURE** pour le Chasseur ou par **ÉVASION** pour le Fuyard. Le format de manches et de sets choisi détermine ensuite le vainqueur du match." },
    ],
  },

  killer: {
    rules: [
      { title: "OBJECTIF", body: "Chaque joueur possède un numéro. Il doit d’abord remplir la condition d’activation pour devenir **Killer**, puis utiliser les touches autorisées pour retirer des vies aux adversaires." },
      { title: "MISE EN PLACE", bullets: [
        "Chaque joueur reçoit un numéro de 1 à 20 : choix manuel, tirage aléatoire ou 1er lancer selon le réglage.",
        "Les vies de départ sont communes à tous les joueurs dans la configuration classique.",
      ] },
      { title: "DEVENIR KILLER", bullets: [
        "Toucher son numéro en simple, ou exiger un double sur son numéro selon la règle choisie.",
        "Une fois Killer, toucher le numéro d’un adversaire vivant lui retire des vies.",
      ] },
      { title: "DÉGÂTS", bullets: [
        "**-1 par hit** : chaque touche valide retire 1 vie.",
        "**Multiplicateur Simple / Double / Triple** : retire respectivement 1, 2 ou 3 vies.",
      ] },
      { title: "VARIANTES SPÉCIALES", bullets: [
        "Auto-pénalité sur son propre numéro.",
        "Vol de vies.",
        "Blind Killer.",
        "Fonctions Bull : dégâts à tous, soin et rotation selon les options activées.",
        "Fonctions Double Bull : dégâts à tous, bouclier, désarmement et rotation selon les options activées.",
        "Résurrection et protection temporaire lorsqu’elles sont activées.",
      ] },
      { title: "ÉLIMINATION", body: "Dans Killer classique, un joueur à 0 vie est éliminé. Le dernier joueur vivant gagne." },
      { title: "KILLER PROGRESSIF", body: "Tous commencent à 0 cœur. Sur son propre numéro : simple = +1, double = +2, triple = +3, jusqu’à 5. À 5 cœurs le statut Killer est actif. Sous 5 il est perdu. À 0 cœur le joueur reste vivant ; l’élimination arrive seulement sous 0." },
    ],
    configuration: [
      { title: "PARTICIPANTS / BOTS", bullets: ["Au moins 2 joueurs.", "Bots IA activables.", "Ordre de départ configurable."] },
      { title: "ATTRIBUTION DES NUMÉROS", bullets: ["Choix manuel.", "Numéros aléatoires.", "1er lancer = choisir son numéro."] },
      { title: "VIES DE DÉPART", body: "Nombre de vies identique pour tous les joueurs ; les valeurs proposées par l’écran vont de 1 à 6." },
      { title: "DEVENIR KILLER", bullets: ["Toucher son numéro — simple.", "Double sur son numéro."] },
      { title: "DÉGÂTS", bullets: ["-1 par hit.", "Multiplicateur Simple / Double / Triple."] },
      { title: "BULL / DOUBLE BULL", body: "Les fonctions spéciales peuvent être activées séparément et certaines sont exclusives pour éviter des règles contradictoires. L’écran propose notamment dégâts, soins, bouclier, désarmement et rotations." },
      { title: "RÉSURRECTION", body: "Peut être désactivée, limitée à un joueur, appliquée à tous une fois, ou rendue illimitée selon la configuration. Le nombre de vies rendu au ressuscité est réglable." },
      { title: "CONDITION DE VICTOIRE", body: "Être le dernier joueur encore vivant." },
    ],
  },

  cricket: {
    rules: [
      { title: "CIBLES", body: "Le Cricket se joue sur les secteurs 15, 16, 17, 18, 19, 20 et Bull. Une cible est fermée lorsqu’elle atteint le nombre de marques demandé." },
      { title: "MARQUES", body: "Simple = 1 marque, Double = 2 marques, Triple = 3 marques." },
      { title: "VICTOIRE", body: "Selon la variante, il faut fermer toutes les cibles et respecter la condition de score choisie. Les variantes sans points ou Cut-Throat modifient la façon dont les points sont comptés." },
    ],
  },

  shanghai: {
    rules: [
      { title: "PRINCIPE", body: "La cible change à chaque manche, généralement 1 puis 2 puis 3, jusqu’à la limite configurée. Seules les touches du numéro du round comptent." },
      { title: "SHANGHAI", body: "Un Shanghai consiste à réaliser **Simple + Double + Triple** du numéro actif dans la même volée de 3 fléchettes." },
      { title: "VICTOIRE", body: "Selon la configuration, un Shanghai peut donner une victoire immédiate ; sinon le classement final se fait au total de points." },
    ],
  },

  five_lives: {
    rules: [
      { title: "PRINCIPE", body: "Chaque joueur commence avec un nombre de vies défini. À son tour, il doit réaliser **strictement plus** que le score total de la volée précédente." },
      { title: "ÉCHEC", body: "Si le joueur n’y parvient pas, il perd une vie. À 0 vie il est éliminé." },
      { title: "VICTOIRE", body: "Le dernier joueur qui possède encore des vies gagne." },
    ],
  },

  scram: {
    configuration: [
      { title: "BOTS IA", body: "Difficulté : **Facile / Normal / Difficile**." },
      { title: "RÈGLES", bullets: ["Bull inclus ou non.", "Choix du premier bloqueur.", "Cap de rounds par phase."] },
      { title: "SAISIE", bullets: ["Keypad compact.", "Cible interactive."] },
    ],
  },

  shooter: {
    configuration: [
      { title: "PARCOURS", bullets: ["Séquence classique 20 → 15.", "Tour 1 → 20.", "PRO : pairs 20 → 2.", "Ordre aléatoire.", "Nombre de cibles configurable."] },
      { title: "ZONE VALIDE", bullets: ["Segment complet Simple / Double / Triple.", "Simple uniquement.", "Double uniquement.", "Triple uniquement."] },
      { title: "VALIDATION", bullets: ["Nombre de marks pour valider.", "Option terminer par Bull.", "Limite de rounds ou illimitée.", "Gestion de l’échec 0/3 et de sa pénalité."] },
      { title: "SAISIE", bullets: ["Keypad X01.", "Cible interactive."] },
    ],
  },

  mario_kart: {
    configuration: [
      { title: "CIRCUIT", bullets: ["30 cases · Court.", "40 cases · Standard.", "50 cases · Long.", "60 cases · Endurance.", "Nombre de tours configurable."] },
      { title: "STYLE DE COURSE", bullets: ["Sprint · pur pilotage.", "Arcade · équilibré.", "Chaos · effets renforcés."] },
      { title: "ARCADE", bullets: ["Cases spéciales.", "Collisions.", "Ordre aléatoire.", "Limite de rounds ou illimitée."] },
      { title: "SAISIE", bullets: ["Keypad X01.", "Cible interactive."] },
    ],
  },

  ocean_control: {
    configuration: [
      { title: "ORGANISATION", bullets: ["Joueurs ou équipes.", "Difficulté Recrue / Capitaine / Amiral.", "Niveau des bots Facile / Normal / Difficile."] },
      { title: "PLACEMENT", bullets: ["Automatique ou manuel.", "Numéros de grille dans l’ordre 1–20 ou aléatoires."] },
      { title: "FORMAT", bullets: ["1 manche.", "Best Of 3.", "Best Of 5."] },
      { title: "RÈGLES SPÉCIALES", bullets: ["Sonar au Bull.", "Frappe Double Bull.", "Gestion d’un tir déjà effectué."] },
      { title: "SAISIE", bullets: ["Keypad.", "Cible tactile."] },
    ],
  },

  cargo: {
    configuration: [
      { title: "PARTICIPANTS / IA", bullets: ["Individuel ou Équipes / Convoi.", "Niveau des bots : Apprenti / Routier / Expert logistique."] },
      { title: "PARTIE", bullets: ["Variante.", "Nombre de tours.", "Contrats visibles ou masqués.", "Ordre aléatoire."] },
      { title: "RÈGLE DE SÉRIE", bullets: ["Segment exact Simple / Double / Triple ou même numéro.", "Série minimale et série maximale.", "Conserver ou non la série entre les tours."] },
      { title: "ERREURS / MISS", bullets: ["Sécuriser.", "Valider partiellement.", "Perdre la charge.", "Refuser la palette.", "Pénalité.", "Décharger."] },
      { title: "CAMION", bullets: ["Capacité du camion.", "Charge cible.", "Comportement en cas de surcharge.", "Palettes fragiles.", "Contrats urgents."] },
      { title: "BULL", bullets: ["Bull : 25 kg ou Joker selon le réglage.", "Double Bull : 50 kg, validation de palette ou protection selon le réglage."] },
      { title: "SAISIE", bullets: ["Clavier.", "Cible interactive."] },
    ],
  },

  bobs_27: {
    configuration: [
      { title: "PARCOURS", bullets: ["Score de départ.", "Premier double.", "Dernier double.", "Option terminer par Double Bull."] },
      { title: "SOUS 0", bullets: ["Élimination — classique.", "Continuer en négatif."] },
      { title: "AUTRES OPTIONS", bullets: ["Ordre aléatoire.", "Bots IA et difficulté Facile / Normal / Difficile.", "Keypad X01 ou cible interactive."] },
    ],
  },

  golf: {
    configuration: [
      { title: "PARTICIPANTS", bullets: ["Mode équipes activable.", "Nombre d’équipes.", "Bots IA et difficulté Easy / Normal / Hard."] },
      { title: "PARCOURS", bullets: ["9 ou 18 trous.", "Ordre chronologique ou aléatoire.", "Ordre de départ."] },
      { title: "SCORING", bullets: ["Strokes ou Points.", "Pénalité en cas de Miss.", "Affichage de la grille des trous."] },
    ],
  },

  president: {
    configuration: [
      { title: "FORMAT", bullets: ["Nombre de manches.", "Cartes par joueur.", "Copies des cartes 1 à 20.", "Ordre de départ aléatoire."] },
      { title: "MODE", bullets: ["Président classique.", "Président Chaos."] },
      { title: "EFFETS SPÉCIAUX", bullets: ["Bull = Joker simple.", "Double Bull = Coup d’État.", "Triple 20 = Révolution."] },
      { title: "SAISIE / IA", bullets: ["Keypad X01 ou cible interactive.", "Difficulté IA Facile / Normal / Difficile."] },
    ],
  },

  darts_poker: {
    configuration: [
      { title: "FORMAT", bullets: ["Nombre de manches.", "Fléchettes par main.", "Ordre aléatoire."] },
      { title: "VISIBILITÉ / BONUS", bullets: ["Mains adverses visibles ou masquées.", "Doubles / Triples spéciaux.", "Double Bull = Joker.", "Contrat bonus par manche."] },
      { title: "BOTS / SAISIE", bullets: ["Niveau Débutant / Joueur / Shark.", "Clavier ou cible interactive."] },
    ],
  },

  baseball: {
    configuration: [
      { title: "FORMAT DU MATCH", bullets: ["Nombre de manches.", "Manches supplémentaires.", "Maximum supplémentaire.", "Règle de la 7e manche."] },
      { title: "RÈGLES", bullets: ["Ordre de passage aléatoire.", "Miss = fin du tour selon l’option.", "Règle Bull / Double Bull et valeur du Bull."] },
      { title: "VARIANTE", bullets: ["Cibles aléatoires — Baseball.", "Attaque / Défense — cible par manche."] },
      { title: "IA / SAISIE", bullets: ["Facile / Normal / Difficile.", "Keypad ou cible interactive."] },
    ],
  },

  bowling: {
    configuration: [
      { title: "FORMAT", bullets: ["Best Of 1 — 1 partie.", "Best Of 3 — 2 victoires.", "Best Of 5 — 3 victoires."] },
      { title: "CONVERSION DARTS → QUILLES", bullets: ["Niveau Facile — plus de quilles.", "Normal — équilibré.", "Difficile — exigeant.", "Bull / Double Bull = Strike selon l’option.", "Double = Spare au 2e lancer selon l’option."] },
      { title: "AUTRES OPTIONS", bullets: ["Ordre aléatoire.", "Bots IA Facile / Normal / Difficile.", "Keypad X01 ou cible interactive."] },
    ],
  },

  halve_it: {
    configuration: [
      { title: "PARCOURS", bullets: ["Classique · 7 cibles.", "Étendu · 9 cibles.", "Débutant · numéros + Bull.", "Expert · 12 cibles."] },
      { title: "DÉPART", bullets: ["0 point — classique simple.", "Capital fixe.", "Volée libre initiale."] },
      { title: "DIVISION", bullets: ["Arrondi inférieur — standard.", "Arrondi supérieur."] },
      { title: "AUTRES OPTIONS", bullets: ["Ordre aléatoire.", "Bots IA Facile / Normal / Difficile.", "Keypad X01 ou cible interactive."] },
    ],
  },

  prisoner: {
    configuration: [
      { title: "PARCOURS", bullets: ["Sens du dartboard — classique.", "Numérique 1 → 20.", "Fléchettes de départ configurables."] },
      { title: "PRISONNIERS / ÉLIMINATION", bullets: ["Miss hors cible = fléchette perdue 1 tour selon l’option.", "Élimination lorsqu’aucune fléchette n’est jouable selon l’option.", "Ordre joueurs aléatoire."] },
      { title: "IA / SAISIE", bullets: ["Facile / Normal / Difficile.", "Keypad X01 + intérieur/extérieur.", "Cible interactive précise."] },
    ],
  },

  loterie: {
    configuration: [
      { title: "CARTONS", bullets: ["Cartons par participant.", "Cases par carton.", "Carton personnel ou commun à tous."] },
      { title: "MODE / VOLÉE", bullets: ["Loterie ou Express.", "Volée 3 darts ou Libre.", "Simple / Double / Triple selon le réglage."] },
      { title: "EXPRESS", bullets: ["1 fléchette.", "Jusqu’à 3 essais.", "Un échec peut consommer un essai ou passer immédiatement le tour selon la règle."] },
      { title: "AFFICHAGE", bullets: ["Numéros restants masqués ou affichés."] },
    ],
  },

  capital: {
    configuration: [
      { title: "BOTS IA", bullets: ["Auto-play activable.", "Vitesse Très rapide / Rapide / Lent / Très lent.", "Prise de risque Prudente / Normale / Agressive.", "Comportement Easy / Hard / Safe / Aggressive."] },
      { title: "PARTIE", bullets: ["Ordre de départ aléatoire ou ordre de sélection.", "Départ Officiel — 15 contrats — ou Custom."] },
      { title: "VICTOIRE / RÈGLES", bullets: ["Meilleur score — Officiel.", "Score cible.", "Meilleur total — dernier contrat."] },
      { title: "TEMPS / SAISIE", bullets: ["Chrono Off ou 15 / 20 / 30 / 45 / 60 secondes.", "Keypad ou cible."] },
    ],
  },

  darts_firefighter: {
    configuration: [
      { title: "MISSION", bullets: ["Choix du scénario et de la difficulté : Recrue, Pompier, Commandant, Inferno ou profils proposés.", "Mission préconfigurée ou personnalisée selon l’écran."] },
      { title: "BRIGADE", body: "Composition des joueurs / équipes / bots selon le scénario et les options disponibles." },
      { title: "CARTE ET INCENDIE", bullets: ["Choix de la carte et des zones.", "Situation initiale.", "Front groupé ou zones proches critiques selon le réglage.", "Rythme de propagation et risque."] },
      { title: "VENT", bullets: ["Direction aléatoire ou réglée.", "Intensité Brise / Normal / Fort.", "Changement après joueur ou après round selon l’option."] },
      { title: "BULL / CANADAIR", bullets: ["Déclenchement selon zone choisie ou priorité auto.", "Puissance 1, 2 ou 3 unités selon le réglage."] },
      { title: "VOLÉE / SAISIE", bullets: ["1 · Éclair, 2 · Tactique, 3 · Standard selon le format proposé.", "Clavier ou cible interactive."] },
    ],
  },

  training_x01: {
    rules: [
      { title: "OBJECTIF", body: "Entraînement basé sur le X01 : travailler le scoring, les sorties et les routines sans logique de match classique." },
      { title: "PARTICIPANTS", body: "Solo, multi-joueurs ou équipes selon la configuration. Chacun s'entraîne à son tour ; en multi / équipes, un comparatif final est généré." },
      { title: "STATISTIQUES", body: "Les variantes de score de départ et de mode OUT restent séparées dans les statistiques Training afin de comparer des sessions équivalentes." },
    ],
    configuration: [
      { title: "SCORE DE DÉPART", bullets: ["301", "501", "701", "901 selon les choix proposés."] },
      { title: "MODE OUT", bullets: ["Simple", "Double", "Master."] },
      { title: "PARTICIPANTS", body: "Sélection du ou des profils / équipes utilisés pour la session Training." },
      { title: "SAISIE", body: "La configuration peut proposer la commande vocale de score en plus des méthodes de saisie usuelles." },
    ],
  },

  tour_horloge: {
    rules: [
      { title: "OBJECTIF", body: "Toucher les numéros dans l'ordre, généralement de **1 à 20**, puis terminer selon la variante choisie." },
      { title: "VARIANTES", bullets: ["Simple : la zone simple valide la cible.", "Double : seul le double valide.", "Triple : seul le triple valide."] },
      { title: "PERFORMANCE", body: "L'objectif principal est de terminer le parcours avec le moins de fléchettes possible." },
    ],
    configuration: [
      { title: "PARCOURS", body: "Choix de la variante / multiplicateur lorsque l'écran le propose." },
      { title: "SESSION", body: "Training solo : le résultat mesure surtout le nombre de fléchettes et la progression, pas un score de match." },
    ],
  },

  training_doubleio: {
    rules: [
      { title: "OBJECTIF", body: "Chaque round impose un **double exact** à toucher en trois fléchettes maximum." },
      { title: "DI", body: "Double In travaille une séquence large de doubles pour apprendre à ouvrir un X01 en Double In." },
      { title: "DO", body: "Double Out privilégie les doubles utilisés pour les checkouts." },
      { title: "DIDO", body: "DIDO alterne travail d'entrée et de sortie." },
    ],
    configuration: [
      { title: "VARIANTE", bullets: ["DI", "DO", "DIDO."] },
      { title: "STATISTIQUES", body: "La session peut enregistrer réussite, précision et progression par cible." },
    ],
  },

  training_challenges: {
    rules: [
      { title: "PRINCIPE", body: "Pack de mini-défis solo. Chaque défi impose un objectif précis et une limite de fléchettes." },
      { title: "EXEMPLES DU CATALOGUE", bullets: ["Trois doubles en neuf fléchettes.", "Séquence BULL → T20 → D20.", "Checkout 40."] },
      { title: "STATISTIQUES", body: "Réussite, précision et progression sont conservées lorsque le défi le prévoit." },
    ],
    configuration: [
      { title: "DÉFI", body: "Choix du challenge disponible dans le menu Training." },
      { title: "OBJECTIF", body: "La cible et la limite viennent du défi choisi ; il n'y a pas de condition de victoire multi-joueurs." },
    ],
  },

  training_ghost: {
    rules: [
      { title: "ADVERSAIRE FANTÔME", body: "Tu affrontes un Ghost dont la **moyenne /3** est configurable." },
      { title: "DÉROULÉ", body: "Le score théorique du Ghost avance après chaque volée pendant le nombre de volées défini." },
      { title: "RÉUSSITE", body: "À la fin, ta moyenne /3 doit être au moins égale à celle du Ghost." },
    ],
    configuration: [
      { title: "NIVEAU DU GHOST", body: "Réglage de la moyenne cible du fantôme." },
      { title: "DURÉE", body: "Nombre de volées de la session." },
    ],
  },

  training_precision_gauntlet: {
    rules: [
      { title: "OBJECTIF", body: "Parcours de précision : une cible exacte est imposée à chaque étape." },
      { title: "CIBLES", bullets: ["Simple", "Double", "Triple", "Bull", "Double Bull selon le parcours."] },
      { title: "ERREURS", body: "Une touche valide fait avancer ; une erreur consomme la tolérance choisie." },
      { title: "PERFORMANCE", body: "Finir le parcours avec le moins de fléchettes possible." },
    ],
    configuration: [
      { title: "PARCOURS", body: "Sélection du parcours / niveau proposé par le Training." },
      { title: "TOLÉRANCE", body: "Nombre d'erreurs acceptées selon la difficulté de la session." },
    ],
  },

  training_repeat_master: {
    rules: [
      { title: "OBJECTIF", body: "Toucher **N fois de suite la même cible exacte**." },
      { title: "SOFT", body: "Une erreur remet la série à zéro, mais la session continue." },
      { title: "HARDCORE", body: "La première erreur termine la session." },
      { title: "MESURES", body: "Meilleure série et précision servent de références." },
    ],
    configuration: [
      { title: "CIBLE", body: "Choix de la cible exacte à répéter." },
      { title: "SÉRIE", body: "Nombre de répétitions à atteindre et mode SOFT / HARDCORE selon l'écran." },
    ],
  },

  training_super_bull: {
    rules: [
      { title: "OBJECTIF", body: "Drill solo centré sur le Bull." },
      { title: "VALEURS", bullets: ["Bull = 25.", "Double Bull = 50.", "Les autres zones comptent comme des ratés Training."] },
      { title: "FIN", body: "Atteindre l'objectif de points avant la limite de fléchettes." },
    ],
    configuration: [
      { title: "OBJECTIF", body: "Score cible de la session." },
      { title: "LIMITE", body: "Nombre maximal de fléchettes disponible." },
    ],
  },

  training_time_attack: {
    rules: [
      { title: "OBJECTIF", body: "Marquer le plus de points possible avant la fin du chrono." },
      { title: "CHRONO", bullets: ["30 secondes", "60 secondes", "120 secondes selon les choix du Training."] },
      { title: "STATISTIQUES", bullets: ["Moyenne /3.", "Meilleure volée.", "Paliers 100+ / 140+ / 180."] },
    ],
    configuration: [
      { title: "DURÉE", body: "Choix du temps de jeu." },
      { title: "DÉPART", body: "Le chrono démarre avec la première volée." },
    ],
  },

  killer_progressive: {
    rules: [
      { title: "ATTRIBUTION", body: "Chaque joueur obtient un numéro avec un lancer de la main opposée." },
      { title: "MONTER À 5", body: "Toucher son propre numéro fait progresser les cœurs : Simple = 1, Double = 2, Triple = 3." },
      { title: "STATUT KILLER", body: "À **5 cœurs**, le joueur devient Killer et peut retirer des cœurs aux adversaires." },
      { title: "PERTE DU STATUT", body: "Sous 5 cœurs, le statut Killer est perdu." },
      { title: "ÉLIMINATION", body: "À 0 cœur le joueur reste vivant ; il est éliminé seulement lorsque son total passe **sous 0**." },
    ],
    configuration: [
      { title: "PARTICIPANTS", body: "Jusqu'à 12 joueurs dans le registre actuel, avec BOTS IA." },
      { title: "RÈGLE PROGRESSIVE", body: "La progression 0 → 5 et l'élimination sous 0 distinguent ce mode du Killer classique." },
    ],
  },

  departements: {
    rules: [
      { title: "DEUX MODES", bullets: ["Classique : capturer / reprendre des territoires.", "Forteresses : protéger ses possessions et attaquer les forteresses adverses."] },
      { title: "VALEURS UNIQUES", body: "Chaque territoire jouable reçoit une valeur distincte calculée à partir de la carte et du niveau des participants. Pour agir, le total de la volée doit respecter la règle EXACT lorsqu'elle est imposée." },
      { title: "FORTERESSES", body: "Un score exact sur un territoire allié peut placer une forteresse. Une attaque exacte brise d'abord une forteresse ennemie ; une nouvelle réussite exacte permet ensuite la conquête." },
      { title: "VOLÉE", body: "Le joueur peut valider après 1 ou 2 fléchettes : il n'est pas obligé de lancer les 3." },
      { title: "BULL / DBULL", body: "L'option spéciale peut donner une nouvelle volée au même joueur, une seule fois avant de rendre la main." },
    ],
    configuration: [
      { title: "PARTICIPANTS", bullets: ["Joueurs : 2 à 10 participants, profils locaux et BOTS compris.", "Équipes : 2 à 4 équipes de 2 ou 3 joueurs, maximum 10 participants au total."] },
      { title: "SÉLECTION DE CIBLE", bullets: ["LIBRE : choisir le territoire sur la carte.", "VOLÉE DIRECTE : le total de la volée désigne automatiquement le territoire portant cette valeur."] },
      { title: "MODE", bullets: ["Classique.", "Forteresses."] },
      { title: "VICTOIRE", bullets: ["Objectif territoires.", "Régions.", "Temps.", "Majorité en nombre.", "Majorité en valeur.", "Conquête totale selon le mode choisi."] },
      { title: "FORTERESSES", body: "Nombre maximal de forteresses actives configurable par joueur / équipe ; une nouvelle protection déplace la plus ancienne lorsque la limite est atteinte." },
    ],
  },

  bastard: {
    rules: [
      { title: "BUT", body: "Tous les joueurs affrontent la même séquence de rounds. Chaque round impose une cible ou un type de touche." },
      { title: "VALIDER", body: "Une volée contient jusqu'à 3 fléchettes. Il faut atteindre le nombre de touches valides demandé pour passer au round suivant." },
      { title: "ÉCHEC", body: "La pénalité choisie peut être : aucune, points retirés, recul dans la séquence ou round à rejouer." },
      { title: "VICTOIRE", bullets: ["Meilleur score : tous terminent, total le plus élevé.", "Premier au bout : fin immédiate lorsqu'un joueur termine la séquence."] },
    ],
    configuration: [
      { title: "PARTICIPANTS", body: "Profils humains + BOTS personnels / Pro, avec difficulté Facile / Normal / Difficile." },
      { title: "PRESETS", bullets: ["Classic : rounds variés.", "Progressif : 1 → 20 puis Bull.", "Punition : malus actifs."] },
      { title: "ÉCHEC D'UN ROUND", bullets: ["Aucune pénalité.", "Points de malus.", "Round à rejouer.", "Recul dans la séquence."] },
      { title: "ÉDITEUR DE SÉQUENCE", body: "En configuration complète, les rounds peuvent être ajoutés, supprimés, réordonnés et édités : nom, type, multiplicateur et cible selon le round." },
    ],
  },

  battle_royale: {
    rules: [
      { title: "PRINCIPE", body: "Mode d'élimination : les joueurs s'affrontent en tours jusqu'à ce qu'il ne reste qu'un survivant." },
      { title: "PRESSION", body: "Les règles de la partie peuvent éliminer un joueur sur échec, objectif raté ou perte de ses ressources selon la configuration active." },
    ],
    configuration: [
      { title: "PARTICIPANTS", body: "Jusqu'à 12 joueurs ; BOTS IA pris en charge ; pas d'équipes dans le registre actuel." },
      { title: "VARIANTE", body: "Les paramètres exacts de pression / élimination sont ceux proposés par l'écran de configuration. Awena peut également lire les contrôles visibles pour détailler un réglage précis." },
    ],
  },

  warfare: {
    rules: [
      { title: "CAMPS", body: "Chaque camp possède des soldats / cibles à protéger." },
      { title: "ATTAQUE", body: "Toucher une cible ennemie blesse ou élimine selon la règle Simple / Double / Triple utilisée." },
      { title: "OPTIONS TACTIQUES", body: "Certaines variantes prévoient friendly fire, soin ou résurrection." },
      { title: "VICTOIRE", body: "Le camp qui élimine les forces adverses gagne." },
    ],
    configuration: [
      { title: "PARTICIPANTS", body: "Équipes et BOTS IA sont pris en charge dans le registre actuel." },
      { title: "RÈGLES TACTIQUES", body: "Les options visibles à l'écran définissent les dégâts, soins, résurrections et autres variantes actives." },
    ],
  },

  football: {
    rules: [
      { title: "PRINCIPE", body: "Le mode simule un match de football : terrain, possession, attaque, défense, tirs, gardien et buts." },
      { title: "IMPACTS", body: "Simple fait progresser ou repousse le ballon ; Double peut intercepter ou accélérer ; Triple peut déclencher une contre-attaque ou une frappe directe selon l'état du jeu." },
      { title: "VARIANTES", bullets: ["Match.", "Golden Goal.", "Tirs au but.", "Classic."] },
    ],
    configuration: [
      { title: "MATCH", bullets: ["RAPIDE : 2 × 3 tours, sans gardien.", "STANDARD : 2 × 5 tours, complet.", "TACTIQUE : 2 × 8 tours, prolongation."] },
      { title: "PARTICIPANTS", bullets: ["1 contre 1.", "2 équipes.", "BOTS IA possibles en duel avec niveau Facile / Normal / Difficile."] },
      { title: "ÉGALITÉ", bullets: ["Match nul.", "Golden Goal.", "Tirs au but.", "Tours de prolongation configurables si Golden Goal."] },
      { title: "AUTRES OPTIONS", bullets: ["Gardien sur tirs cadrés.", "Volée sans cible = ballon perdu.", "Ordre de départ aléatoire en duel.", "Clavier compact ou cible tactile."] },
    ],
  },

  // AWENA V8.3 — couverture détaillée des modes ajoutés au registre V74.
  // Pour les concepts marqués "À implémenter" dans la source, Awena indique
  // explicitement leur état et n’invente pas une mécanique finale.
  enculette: {
    rules: [
      { title: "ÉTAT DANS L’APPLICATION", body: "Mode jouable via la famille Cricket avec la variante Enculette / Vache." },
      { title: "PRINCIPE", body: "Mode de score sur un nombre de rounds défini. Chaque volée ajoute son total au score." },
      { title: "RÈGLES / MÉCANIQUES", bullets: [
        "Une volée à **0** entraîne une pénalité de **-50 points**.",
        "Un objectif peut être défini : le premier qui l’atteint gagne.",
        "Si l’objectif est réglé à 0, le meilleur total à la fin des rounds gagne.",
      ] },
    ],
    configuration: [
      { title: "ÉTAT / MATURITÉ", body: "Mode jouable via la famille Cricket avec la variante Enculette / Vache." },
      { title: "RÉGLAGES CONNUS / PRÉVUS", bullets: [
        "nombre de rounds",
        "objectif de score optionnel",
        "participants / BOTS selon le Cricket",
        "preset de variante Enculette",
      ] },
    ],
  },
  cricket_cut_throat: {
    rules: [
      { title: "ÉTAT DANS L’APPLICATION", body: "Variante Cricket dédiée dans le registre actuel." },
      { title: "PRINCIPE", body: "Cut-Throat inverse la logique des points : quand tu marques sur une cible que tu as fermée et qu’un adversaire n’a pas encore fermée, les points sont ajoutés aux adversaires encore ouverts." },
      { title: "RÈGLES / MÉCANIQUES", bullets: [
        "Les fermetures restent basées sur les cibles Cricket.",
        "L’objectif stratégique est d’éviter d’accumuler les points reçus : être devant signifie généralement avoir **le moins de points** tout en remplissant la condition de fermeture.",
      ] },
    ],
    configuration: [
      { title: "ÉTAT / MATURITÉ", body: "Variante Cricket dédiée dans le registre actuel." },
      { title: "RÉGLAGES CONNUS / PRÉVUS", bullets: [
        "preset Cut-Throat du Cricket",
        "participants / équipes selon le Cricket",
        "BOTS IA pris en charge",
        "cibles Cricket 15 à 20 + Bull",
      ] },
    ],
  },
  super_bull: {
    rules: [
      { title: "ÉTAT DANS L’APPLICATION", body: "Mode présent et jouable dans une version MVP ; le registre précise que la mécanique Bull / Double Bull dédiée doit encore être consolidée." },
      { title: "PRINCIPE", body: "Dans la version actuelle décrite par le registre, les joueurs enchaînent des volées notées de 0 à 180 sur un nombre de rounds défini." },
      { title: "RÈGLES / MÉCANIQUES", bullets: [
        "Un objectif de score peut être activé.",
        "Avec objectif : le premier à l’atteindre gagne.",
        "Sans objectif atteint : le meilleur total à la fin des rounds gagne.",
      ] },
    ],
    configuration: [
      { title: "ÉTAT / MATURITÉ", body: "Mode présent et jouable dans une version MVP ; le registre précise que la mécanique Bull / Double Bull dédiée doit encore être consolidée." },
      { title: "RÉGLAGES CONNUS / PRÉVUS", bullets: [
        "participants",
        "nombre de rounds",
        "objectif optionnel",
        "paramètres Bull / Double Bull proposés par l’écran",
      ] },
    ],
  },
  happy_mille: {
    rules: [
      { title: "ÉTAT DANS L’APPLICATION", body: "Variante X01 / course au score présente dans l’application." },
      { title: "PRINCIPE", body: "Course au score sur un nombre de rounds défini, avec **1000 points par défaut** comme objectif." },
      { title: "RÈGLES / MÉCANIQUES", bullets: [
        "Le premier joueur à atteindre l’objectif gagne.",
        "Si personne ne l’atteint avant la fin des rounds, le meilleur total gagne.",
      ] },
    ],
    configuration: [
      { title: "ÉTAT / MATURITÉ", body: "Variante X01 / course au score présente dans l’application." },
      { title: "RÉGLAGES CONNUS / PRÉVUS", bullets: [
        "participants",
        "nombre de rounds",
        "objectif de score modifiable",
        "BOTS IA selon le registre",
      ] },
    ],
  },
  v170: {
    rules: [
      { title: "ÉTAT DANS L’APPLICATION", body: "Défi 170 présent dans l’application." },
      { title: "PRINCIPE", body: "Chaque volée cherche **exactement 170**. Une volée qui fait exactement 170 rapporte **1 réussite / point**." },
      { title: "RÈGLES / MÉCANIQUES", bullets: [
        "Les autres totaux ne valident pas la réussite.",
        "Après le nombre de rounds prévu, le joueur avec le plus de réussites gagne.",
      ] },
    ],
    configuration: [
      { title: "ÉTAT / MATURITÉ", body: "Défi 170 présent dans l’application." },
      { title: "RÉGLAGES CONNUS / PRÉVUS", bullets: [
        "participants",
        "nombre de rounds",
        "ordre de départ",
        "BOTS IA selon le registre",
      ] },
    ],
  },
  count_up: {
    rules: [
      { title: "ÉTAT DANS L’APPLICATION", body: "Mode Count-Up présent avec configuration dédiée." },
      { title: "PRINCIPE", body: "Chaque volée est ajoutée au total du joueur : le score monte au lieu de descendre." },
      { title: "RÈGLES / MÉCANIQUES", bullets: [
        "Avec objectif : le premier à atteindre la cible gagne.",
        "Sans objectif ou si personne ne l’atteint : meilleur total en fin de rounds.",
      ] },
    ],
    configuration: [
      { title: "ÉTAT / MATURITÉ", body: "Mode Count-Up présent avec configuration dédiée." },
      { title: "RÉGLAGES CONNUS / PRÉVUS", bullets: [
        "participants",
        "nombre de rounds",
        "objectif de score optionnel",
        "ordre de départ",
      ] },
    ],
  },
  knockout: {
    rules: [
      { title: "ÉTAT DANS L’APPLICATION", body: "Une entrée et une configuration existent, mais le registre indique encore **À implémenter** pour la mécanique complète." },
      { title: "PRINCIPE", body: "Concept d’élimination par score, proche de Les 5 Vies mais prévu pour être configurable." },
      { title: "RÈGLES / MÉCANIQUES", bullets: [
        "Le détail exact des critères d’élimination doit être pris sur l’écran réellement disponible.",
        "Awena ne doit pas inventer une règle finale tant que le code source la marque comme à implémenter.",
      ] },
    ],
    configuration: [
      { title: "ÉTAT / MATURITÉ", body: "Une entrée et une configuration existent, mais le registre indique encore **À implémenter** pour la mécanique complète." },
      { title: "RÉGLAGES CONNUS / PRÉVUS", bullets: [
        "participants",
        "BOTS IA",
        "paramètres d’élimination visibles",
        "paramètres de score visibles",
      ] },
    ],
  },
  rugby: {
    rules: [
      { title: "ÉTAT DANS L’APPLICATION", body: "Une entrée / configuration Darts Rugby existe, mais le registre indique encore **À implémenter**." },
      { title: "PRINCIPE", body: "Concept basé sur une progression de territoires / zones, puis validation d’un essai et d’une transformation." },
      { title: "RÈGLES / MÉCANIQUES", bullets: [
        "La description source prévoit une progression de zones.",
        "Bull peut servir à l’essai et Double à la transformation dans le concept actuel.",
        "Les règles finales doivent être confirmées par l’écran / code actif car le registre marque encore l’implémentation incomplète.",
      ] },
    ],
    configuration: [
      { title: "ÉTAT / MATURITÉ", body: "Une entrée / configuration Darts Rugby existe, mais le registre indique encore **À implémenter**." },
      { title: "RÉGLAGES CONNUS / PRÉVUS", bullets: [
        "participants",
        "BOTS si proposés",
        "paramètres de match / score visibles",
        "options de territoires / progression",
      ] },
    ],
  },
  tic_tac_toe: {
    rules: [
      { title: "ÉTAT DANS L’APPLICATION", body: "Une configuration Morpion existe, mais le registre marque encore la mécanique comme **À implémenter**." },
      { title: "PRINCIPE", body: "Concept de grille **3 × 3** : chaque case correspond à une cible. Une touche capture une case et le premier alignement de 3 gagne." },
      { title: "RÈGLES / MÉCANIQUES", bullets: [
        "Ligne, colonne ou diagonale de 3 cases pour gagner.",
        "Les paramètres exacts de validation doivent être lus sur l’écran tant que l’implémentation reste incomplète.",
      ] },
    ],
    configuration: [
      { title: "ÉTAT / MATURITÉ", body: "Une configuration Morpion existe, mais le registre marque encore la mécanique comme **À implémenter**." },
      { title: "RÉGLAGES CONNUS / PRÉVUS", bullets: [
        "participants",
        "grille / cibles",
        "règle de validation",
        "ordre de départ",
      ] },
    ],
  },
  fun_gages: {
    rules: [
      { title: "ÉTAT DANS L’APPLICATION", body: "Concept enregistré mais sans écran Play / configuration dédié dans la version actuelle." },
      { title: "PRINCIPE", body: "Mode transversal de gages déclenchés par certains événements de partie." },
      { title: "RÈGLES / MÉCANIQUES", bullets: [
        "Le registre cite notamment bust, 180 et Bull comme événements possibles.",
        "Le concept prévoit un réglage ON/OFF et un overlay de gage.",
        "**À implémenter** : ne pas le présenter comme un mode finalisé.",
      ] },
    ],
    configuration: [
      { title: "ÉTAT / MATURITÉ", body: "Concept enregistré mais sans écran Play / configuration dédié dans la version actuelle." },
      { title: "RÉGLAGES CONNUS / PRÉVUS", bullets: [
        "concept de gages",
        "événements déclencheurs",
        "activation / désactivation prévue",
      ] },
    ],
  },
  bingo: {
    rules: [
      { title: "ÉTAT DANS L’APPLICATION", body: "Concept enregistré mais sans implémentation dédiée finalisée." },
      { title: "PRINCIPE", body: "Concept de Bingo avec grille de cibles **3 × 3 ou 5 × 5**." },
      { title: "RÈGLES / MÉCANIQUES", bullets: [
        "Les joueurs cherchent une ligne, colonne, diagonale ou éventuellement la grille complète selon la variante.",
        "Le registre prévoit des grilles aléatoires ou communes.",
        "**À implémenter** dans le code actuel.",
      ] },
    ],
    configuration: [
      { title: "ÉTAT / MATURITÉ", body: "Concept enregistré mais sans implémentation dédiée finalisée." },
      { title: "RÉGLAGES CONNUS / PRÉVUS", bullets: [
        "taille de grille prévue",
        "condition ligne / colonne / diagonale / complète",
        "grille aléatoire ou commune",
      ] },
    ],
  },
  follow_the_leader: {
    rules: [
      { title: "ÉTAT DANS L’APPLICATION", body: "Concept enregistré, marqué **À implémenter**." },
      { title: "PRINCIPE", body: "Un leader établit une cible / combinaison, les suivants doivent la reproduire." },
      { title: "RÈGLES / MÉCANIQUES", bullets: [
        "Le concept distingue reproduction exacte numéro + multiplicateur ou reproduction partielle du numéro.",
        "Un échec entraîne une pénalité selon la variante.",
        "Variantes conceptuelles : Chase / Copycat.",
      ] },
    ],
    configuration: [
      { title: "ÉTAT / MATURITÉ", body: "Concept enregistré, marqué **À implémenter**." },
      { title: "RÉGLAGES CONNUS / PRÉVUS", bullets: [
        "règle de reproduction",
        "pénalité d’échec",
        "variantes Chase / Copycat",
      ] },
    ],
  },
  conquest: {
    rules: [
      { title: "ÉTAT DANS L’APPLICATION", body: "Concept de jeu enregistré mais non finalisé." },
      { title: "PRINCIPE", body: "Jeu de capture de zones / influence où les adversaires peuvent reprendre des territoires." },
      { title: "RÈGLES / MÉCANIQUES", bullets: [
        "Objectifs conceptuels : majorité, influence ou domination.",
        "Les règles définitives ne sont pas encore implémentées dans une page dédiée.",
      ] },
    ],
    configuration: [
      { title: "ÉTAT / MATURITÉ", body: "Concept de jeu enregistré mais non finalisé." },
      { title: "RÉGLAGES CONNUS / PRÉVUS", bullets: [
        "zones / territoires",
        "objectif majorité / domination",
        "règles de reprise",
      ] },
    ],
  },
  domination: {
    rules: [
      { title: "ÉTAT DANS L’APPLICATION", body: "Concept enregistré, sans implémentation dédiée finalisée." },
      { title: "PRINCIPE", body: "Chaque round impose une contrainte — par exemple Doubles, nombres impairs ou Bull — et les effets ne s’appliquent que si la contrainte est respectée." },
      { title: "RÈGLES / MÉCANIQUES", bullets: [
        "La contrainte change le choix de cible.",
        "Les bonus / effets exacts doivent être définis par l’implémentation future.",
      ] },
    ],
    configuration: [
      { title: "ÉTAT / MATURITÉ", body: "Concept enregistré, sans implémentation dédiée finalisée." },
      { title: "RÉGLAGES CONNUS / PRÉVUS", bullets: [
        "contraintes de round",
        "effets conditionnels",
        "nombre de rounds",
      ] },
    ],
  },
  mines_traps: {
    rules: [
      { title: "ÉTAT DANS L’APPLICATION", body: "Concept enregistré, marqué **À implémenter**." },
      { title: "PRINCIPE", body: "Des segments cachés contiennent des mines / pièges qui déclenchent des pénalités." },
      { title: "RÈGLES / MÉCANIQUES", bullets: [
        "Le concept prévoit un rôle de détection / risque.",
        "Bull peut servir de scan ou de désarmement selon la règle prévue.",
        "Aucune règle finale ne doit être inventée avant implémentation.",
      ] },
    ],
    configuration: [
      { title: "ÉTAT / MATURITÉ", body: "Concept enregistré, marqué **À implémenter**." },
      { title: "RÉGLAGES CONNUS / PRÉVUS", bullets: [
        "placement des mines",
        "pénalités",
        "fonction Bull scan / désarmement",
      ] },
    ],
  },
  last_man_standing: {
    rules: [
      { title: "ÉTAT DANS L’APPLICATION", body: "Concept de survie enregistré mais non finalisé." },
      { title: "PRINCIPE", body: "Chaque joueur possède un nombre de vies et doit réussir un objectif à chaque tour." },
      { title: "RÈGLES / MÉCANIQUES", bullets: [
        "Un échec fait perdre une vie.",
        "Le dernier joueur encore vivant gagne.",
        "Le détail des objectifs / vies reste à implémenter.",
      ] },
    ],
    configuration: [
      { title: "ÉTAT / MATURITÉ", body: "Concept de survie enregistré mais non finalisé." },
      { title: "RÉGLAGES CONNUS / PRÉVUS", bullets: [
        "vies de départ",
        "objectifs par tour",
        "pénalité d’échec",
      ] },
    ],
  },
  bomb_countdown: {
    rules: [
      { title: "ÉTAT DANS L’APPLICATION", body: "Concept enregistré, marqué **À implémenter**." },
      { title: "PRINCIPE", body: "Une bombe possède un compte à rebours. Les touches peuvent le réduire tandis que les échecs peuvent l’accélérer." },
      { title: "RÈGLES / MÉCANIQUES", bullets: [
        "Le joueur qui provoque l’arrivée à zéro peut perdre ou subir l’effet prévu selon la règle finale.",
        "Les détails exacts sont encore conceptuels.",
      ] },
    ],
    configuration: [
      { title: "ÉTAT / MATURITÉ", body: "Concept enregistré, marqué **À implémenter**." },
      { title: "RÉGLAGES CONNUS / PRÉVUS", bullets: [
        "compte à rebours",
        "effet des touches",
        "effet des MISS",
        "condition d’explosion",
      ] },
    ],
  },
  infection: {
    rules: [
      { title: "ÉTAT DANS L’APPLICATION", body: "Concept enregistré, marqué **À implémenter**." },
      { title: "PRINCIPE", body: "Un joueur infecté peut transmettre l’infection à un adversaire en remplissant une condition de touche." },
      { title: "RÈGLES / MÉCANIQUES", bullets: [
        "La partie cherche un dernier non-infecté ou un survivant selon la future variante.",
        "La condition exacte de transmission reste à implémenter.",
      ] },
    ],
    configuration: [
      { title: "ÉTAT / MATURITÉ", body: "Concept enregistré, marqué **À implémenter**." },
      { title: "RÉGLAGES CONNUS / PRÉVUS", bullets: [
        "infecté initial",
        "condition de contamination",
        "condition de victoire",
      ] },
    ],
  },
  randomizer: {
    rules: [
      { title: "ÉTAT DANS L’APPLICATION", body: "Concept enregistré mais sans moteur finalisé." },
      { title: "PRINCIPE", body: "Chaque volée peut recevoir une cible, une règle, un bonus ou un malus aléatoire." },
      { title: "RÈGLES / MÉCANIQUES", bullets: [
        "Le but est d’adapter rapidement sa stratégie.",
        "Les tables aléatoires et effets définitifs restent à implémenter.",
      ] },
    ],
    configuration: [
      { title: "ÉTAT / MATURITÉ", body: "Concept enregistré mais sans moteur finalisé." },
      { title: "RÉGLAGES CONNUS / PRÉVUS", bullets: [
        "fréquence des tirages",
        "cibles aléatoires",
        "bonus / malus",
      ] },
    ],
  },
  casino: {
    rules: [
      { title: "ÉTAT DANS L’APPLICATION", body: "Concept enregistré, marqué **À implémenter**." },
      { title: "PRINCIPE", body: "Les segments déclenchent des effets de casino : gain, vol, inversion, banqueroute ou autres événements." },
      { title: "RÈGLES / MÉCANIQUES", bullets: [
        "Bull est prévu comme Jackpot dans le concept.",
        "La victoire peut dépendre d’un objectif ou du meilleur total selon la future règle.",
      ] },
    ],
    configuration: [
      { title: "ÉTAT / MATURITÉ", body: "Concept enregistré, marqué **À implémenter**." },
      { title: "RÉGLAGES CONNUS / PRÉVUS", bullets: [
        "table des effets",
        "Jackpot Bull",
        "objectif / meilleur total",
      ] },
    ],
  },
  chaos_mode: {
    rules: [
      { title: "ÉTAT DANS L’APPLICATION", body: "Concept enregistré, marqué **À implémenter**." },
      { title: "PRINCIPE", body: "Les règles changent périodiquement, par exemple toutes les X fléchettes, avec bonus et malus." },
      { title: "RÈGLES / MÉCANIQUES", bullets: [
        "Le joueur doit s’adapter aux mutations de règle.",
        "Les objectifs possibles incluent survie ou score maximal, mais le moteur final n’est pas encore implémenté.",
      ] },
    ],
    configuration: [
      { title: "ÉTAT / MATURITÉ", body: "Concept enregistré, marqué **À implémenter**." },
      { title: "RÉGLAGES CONNUS / PRÉVUS", bullets: [
        "fréquence des changements",
        "pool de règles",
        "bonus / malus",
        "condition de victoire",
      ] },
    ],
  },
  coop_mission: {
    rules: [
      { title: "ÉTAT DANS L’APPLICATION", body: "Concept coopératif enregistré mais non finalisé." },
      { title: "PRINCIPE", body: "Les joueurs coopèrent sur des objectifs communs, potentiellement avec des rôles complémentaires." },
      { title: "RÈGLES / MÉCANIQUES", bullets: [
        "La mission doit être accomplie avant une limite de temps ou de tours.",
        "Les objectifs et rôles définitifs restent à implémenter.",
      ] },
    ],
    configuration: [
      { title: "ÉTAT / MATURITÉ", body: "Concept coopératif enregistré mais non finalisé." },
      { title: "RÉGLAGES CONNUS / PRÉVUS", bullets: [
        "mission",
        "rôles",
        "limite de temps / tours",
        "objectifs communs",
      ] },
    ],
  },
  boss_battle: {
    rules: [
      { title: "ÉTAT DANS L’APPLICATION", body: "Concept coopératif enregistré, marqué **À implémenter**." },
      { title: "PRINCIPE", body: "Un Boss possède des points de vie et plusieurs phases ; certaines zones deviennent vulnérables selon la phase." },
      { title: "RÈGLES / MÉCANIQUES", bullets: [
        "Les joueurs coopèrent pour réduire les PV du Boss.",
        "La victoire conceptuelle consiste à le battre avant le timer / nombre de rounds.",
      ] },
    ],
    configuration: [
      { title: "ÉTAT / MATURITÉ", body: "Concept coopératif enregistré, marqué **À implémenter**." },
      { title: "RÉGLAGES CONNUS / PRÉVUS", bullets: [
        "PV du Boss",
        "phases",
        "zones vulnérables",
        "timer / rounds",
      ] },
    ],
  },
  rpg_darts: {
    rules: [
      { title: "ÉTAT DANS L’APPLICATION", body: "Concept RPG enregistré mais sans implémentation dédiée finalisée." },
      { title: "PRINCIPE", body: "Concept de progression persistante : niveaux, expérience, compétences et bonus passifs." },
      { title: "RÈGLES / MÉCANIQUES", bullets: [
        "L’expérience / les compétences doivent former une méta-progression.",
        "Le système précis n’est pas encore implémenté dans le registre actuel.",
      ] },
    ],
    configuration: [
      { title: "ÉTAT / MATURITÉ", body: "Concept RPG enregistré mais sans implémentation dédiée finalisée." },
      { title: "RÉGLAGES CONNUS / PRÉVUS", bullets: [
        "progression / XP",
        "niveaux",
        "compétences",
        "bonus passifs",
      ] },
    ],
  },
  blind_darts: {
    rules: [
      { title: "ÉTAT DANS L’APPLICATION", body: "Concept expérimental enregistré, marqué **À implémenter**." },
      { title: "PRINCIPE", body: "Concept où la cible ou les indications sont partiellement masquées afin de travailler concentration et repères." },
      { title: "RÈGLES / MÉCANIQUES", bullets: [
        "La quantité d’information cachée doit être définie par l’implémentation.",
        "Ne pas confondre avec une règle sportive officielle.",
      ] },
    ],
    configuration: [
      { title: "ÉTAT / MATURITÉ", body: "Concept expérimental enregistré, marqué **À implémenter**." },
      { title: "RÉGLAGES CONNUS / PRÉVUS", bullets: [
        "niveau de masquage",
        "consignes minimales",
        "format de session",
      ] },
    ],
  },
  sound_darts: {
    rules: [
      { title: "ÉTAT DANS L’APPLICATION", body: "Concept expérimental enregistré, marqué **À implémenter**." },
      { title: "PRINCIPE", body: "La cible à viser est dictée par un signal / une consigne audio, avec un objectif de réaction." },
      { title: "RÈGLES / MÉCANIQUES", bullets: [
        "Le concept prévoit potentiellement un timer.",
        "Les règles de scoring et de réaction restent à implémenter.",
      ] },
    ],
    configuration: [
      { title: "ÉTAT / MATURITÉ", body: "Concept expérimental enregistré, marqué **À implémenter**." },
      { title: "RÉGLAGES CONNUS / PRÉVUS", bullets: [
        "consignes audio",
        "timer / réaction",
        "barème futur",
      ] },
    ],
  },

};

function renderSections(sections: Section[]) {
  return sections.map((section) => {
    const lines: string[] = [`## ${section.title}`];
    if (section.body) lines.push(section.body);
    if (section.bullets?.length) lines.push(...section.bullets.map((item) => `- ${item}`));
    if (section.note) lines.push(`> ${section.note}`);
    return lines.join("\n");
  }).join("\n\n");
}

export function detailedRulesText(mode: AwenaModeLike) {
  const deep = DEEP[mode.id]?.rules;
  if (deep?.length) return renderSections(deep);

  const sections: Section[] = [
    { title: "PRINCIPE", body: mode.summary },
    { title: "CONDITION DE VICTOIRE", body: mode.victoryCondition },
  ];
  if (mode.variants?.length) sections.push({ title: "VARIANTES / CHOIX", bullets: mode.variants });
  return renderSections(sections);
}

export function detailedConfigurationText(mode: AwenaModeLike) {
  const deep = DEEP[mode.id]?.configuration;
  const participantLine = mode.maxPlayers === 1
    ? "Solo."
    : `Jusqu’à ${mode.maxPlayers} joueurs.${mode.supportsTeams ? " Équipes prises en charge." : " Pas d’équipes dans le registre actuel."}${mode.supportsBots ? " Bots IA pris en charge." : " Pas de bots IA dans le registre actuel."}`;

  const sections: Section[] = [
    { title: `CONFIGURATION — ${mode.label.toUpperCase()}`, body: participantLine },
    ...(deep?.length ? deep : [{ title: "OPTIONS DISPONIBLES", body: mode.configuration }]),
    { title: "CONDITION DE VICTOIRE", body: mode.victoryCondition },
  ];
  if (mode.variants?.length && !deep?.some((s) => /variante/i.test(s.title))) {
    sections.push({ title: "VARIANTES / CHOIX", bullets: mode.variants });
  }
  sections.push({ title: "DANS L’APPLICATION", body: mode.howToPlayInApp });
  return renderSections(sections);
}
