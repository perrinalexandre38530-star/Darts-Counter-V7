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
      { title: "OBJECTIF", body: "Chaque joueur part du score choisi pour la partie et soustrait le total de ses fléchettes. Le but est d’être le premier à atteindre **exactement 0**." },
      { title: "UN TOUR", body: "À son tour, un joueur lance jusqu’à **3 fléchettes**. La valeur de chaque impact est soustraite : Simple = valeur du secteur, Double = ×2, Triple = ×3, Bull = 25 et Double Bull = 50." },
      { title: "RÈGLE D’ENTRÉE", body: "Le mode **IN** choisi avant la partie détermine quand le score commence réellement à descendre : Simple In autorise toute touche valide ; Double In exige d’abord un double ; Master In exige un double ou un triple." },
      { title: "RÈGLE DE SORTIE", body: "Le mode **OUT** choisi détermine la fléchette qui peut terminer le leg : Simple Out autorise toute touche donnant exactement 0 ; Double Out exige un double ; Master Out exige un double ou un triple." },
      { title: "BUST", body: "Si la volée rend la fin de leg impossible ou interdite par le OUT — par exemple score négatif ou arrivée à 0 avec une mauvaise zone — c’est un **Bust** : la volée est annulée et le score revient à sa valeur du début du tour." },
      { title: "LEG, SET ET MATCH", body: "Le joueur qui atteint 0 correctement gagne le **leg**. Si le match utilise des sets, il faut ensuite gagner le nombre de legs prévu pour prendre un set, puis le nombre de sets prévu pour gagner le match." },
    ],
    configuration: [
      { title: "MODE DE CONFIGURATION", bullets: [
        "**Guidée** : Awena et l’écran te font avancer étape par étape jusqu’au récapitulatif.",
        "**Complète** : tous les réglages X01 sont accessibles sur une seule page.",
      ] },
      { title: "PARTICIPANTS", bullets: [
        "**Joueurs** : duel 1v1 ou multi ; sélection de profils locaux et de bots IA.",
        "**Équipes** : équipes manuelles Gold/Pink/Blue/Green, équipes enregistrées, équipes de bots ou **Brassage auto**.",
        "Le dartset associé à chaque participant peut être choisi lorsque le sélecteur le propose.",
      ] },
      { title: "SCORE DE DÉPART", bullets: ["301", "501", "701", "901"] },
      { title: "IN", bullets: [
        "**Simple In** : les points comptent dès la première touche valide.",
        "**Double In** : il faut toucher un double avant de commencer à soustraire.",
        "**Master In** : un double ou un triple ouvre le score.",
      ] },
      { title: "OUT", bullets: [
        "**Simple Out** : toute touche exacte peut terminer le leg.",
        "**Double Out** : la dernière fléchette doit être un double.",
        "**Master Out** : la dernière fléchette doit être un double ou un triple.",
      ] },
      { title: "FORMAT — SETS", bullets: [
        "Format **Best Of** ou **First To**.",
        "Valeurs proposées : 1, 3, 5, 7, 9, 11 ou 13 sets.",
      ] },
      { title: "FORMAT — LEGS", bullets: [
        "**Best Of** : 1, 3, 5, 7, 9, 11, 13 ou 15 legs.",
        "**First To** : 1, 3, 5, 7, 9, 10, 11, 13, 15, 16, 17 ou 18 legs à gagner.",
        "Des **presets Pro** sont proposés : Qualifications, tours, Pro Tour, formats Mondial en sets et World Matchplay en First To.",
      ] },
      { title: "ORDRE DE DÉPART", bullets: [
        "**Alterné** : l’ordre de départ alterne selon le format.",
        "**Aléatoire** : le premier joueur est tiré au sort.",
      ] },
      { title: "MÉTHODE DE SAISIE", bullets: [
        "**KEYPAD** : saisie manuelle classique.",
        "**CIBLE** : touche directement la zone S/D/T sur la cible interactive.",
        "**PRESETS** : raccourcis de scores tout en conservant le détail nécessaire aux statistiques.",
        "**VOICE** : saisie vocale du score avec récapitulatif et confirmation.",
      ] },
      { title: "AUDIO", bullets: [
        "**Sons Arcade** ON/OFF.",
        "**Bruitages** d’impacts ON/OFF.",
        "**Voix IA** ON/OFF et choix de la voix lorsqu’il est proposé.",
      ] },
      { title: "COMPTAGE EXTERNE", bullets: [
        "Activation ou désactivation du comptage externe.",
        "Sources disponibles selon l’appareil : **Téléphone compagnon**, **Caméra locale**, **Bridge réseau**, **Scolia**, **Grandarts** ou **Bluetooth**.",
        "Certains modes de saisie incompatibles sont automatiquement désactivés lorsqu’un comptage externe est activé.",
      ] },
      { title: "RÉCAPITULATIF", body: "Avant de lancer, vérifie participants, score, IN, OUT, format, ordre, méthode de saisie, audio et éventuel comptage externe. Le bouton de lancement utilise exactement ces réglages." },
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
      { title: "PARTICIPANTS / BOTS", bullets: [
        "Au moins **2 joueurs**.",
        "Profils locaux et **Bots IA** peuvent être sélectionnés lorsque le sélecteur les propose.",
        "L’ordre des participants est réglé avant le lancement.",
      ] },
      { title: "KILLER CLASSIQUE OU KILLER PROGRESSIF", bullets: [
        "**Killer classique** : utilise les vies de départ et toutes les variantes détaillées ci-dessous.",
        "**Killer Progressif** : règles fixes et isolées : attribution au 1er lancer, départ à 0 cœur, progression jusqu’à 5 pour devenir Killer ; les variantes classiques spéciales sont désactivées.",
      ] },
      { title: "ATTRIBUTION DES NUMÉROS", bullets: [
        "**Choix manuel** : sélection du numéro 1–20 pour chaque joueur.",
        "**Numéros aléatoires** : l’application attribue des numéros uniques.",
        "**1er lancer = choisir son numéro** : le numéro est déterminé par un lancer physique ; les doublons sont refusés.",
        "**Blind Killer** est incompatible avec le mode 1er lancer.",
      ] },
      { title: "VIES DE DÉPART", body: "En Killer classique, tous les joueurs commencent avec le même nombre de vies. L’écran propose **1 à 6 vies**." },
      { title: "DEVENIR KILLER", bullets: [
        "**Toucher son numéro (simple)** : une touche sur son propre numéro suffit.",
        "**Double sur son numéro** : il faut toucher le double de son numéro pour activer le statut Killer.",
      ] },
      { title: "DÉGÂTS QUAND ON EST KILLER", bullets: [
        "**-1 par hit** : chaque touche valide sur le numéro d’un adversaire vivant retire exactement 1 vie.",
        "**Multiplicateur S/D/T** : Simple = −1 vie, Double = −2, Triple = −3.",
      ] },
      { title: "AUTO-PÉNALITÉ", bullets: [
        "**Auto-pénalité** : si un joueur déjà Killer touche son propre numéro, il perd des vies au lieu de mourir instantanément.",
        "**Auto-pénalité = multiplicateur** : la perte devient S=−1, D=−2, T=−3 ; cette option n’est disponible que si l’auto-pénalité est activée.",
      ] },
      { title: "VOL DE VIES — LIFE STEAL", body: "Si **Vol de vies** est activé, les vies retirées à la cible sont **transférées au Killer** qui a porté le coup. Le Killer récupère donc autant de vies que la cible en perd selon la règle de dégâts active. Cette option est incompatible avec **BULL = soins**." },
      { title: "BLIND KILLER", body: "Masque les numéros des joueurs à l’écran pendant la partie pour augmenter la difficulté. Cette variante est **incompatible avec ‘1er lancer = choisir son numéro’**." },
      { title: "FONCTIONS BULL", bullets: [
        "**BULL = dégâts à tous** : SBULL retire **1 vie à chaque adversaire vivant** ; DBULL retire **2 vies à chaque adversaire vivant** lorsque cette fonction est active.",
        "**BULL = soins** : BULL ou DBULL rend au tireur un nombre réglable de vies : **+1, +2 ou +3**.",
        "**Rotation BULL** : si plusieurs fonctions BULL sont cochées, la fonction active change automatiquement **à chaque tour** ; sans rotation, dégâts à tous et soins sont exclusifs.",
        "**Incompatibilités** : BULL dégâts à tous ↔ BULL soins ; BULL soins ↔ Vol de vies, sauf logique de rotation prévue par l’écran pour les fonctions BULL compatibles avec cette rotation.",
      ] },
      { title: "FONCTIONS DBULL", bullets: [
        "**DBULL = dégâts à tous (-2)** : retire 2 vies à chaque adversaire vivant lorsque la fonction de zone est active.",
        "**DBULL = bouclier** : donne au tireur un bouclier temporaire.",
        "**DBULL = désarmement** : tous les autres Killers perdent leur statut ; le tireur reste Killer. Les autres doivent retoucher leur numéro pour redevenir Killer.",
        "**Rotation DBULL** : dégâts, bouclier et/ou désarmement peuvent alterner **tour après tour** parmi les fonctions cochées.",
        "Sans rotation, **bouclier et désarmement sont exclusifs**.",
      ] },
      { title: "BOUCLIER DBULL", bullets: [
        "La durée est réglable de **1 à 5 tours du joueur protégé**.",
        "Un **DOUBLE adverse** sur le numéro du joueur protégé **casse entièrement** le bouclier.",
        "Un **TRIPLE adverse** sur son numéro **affaiblit le bouclier de moitié**.",
        "Deux triples l’annulent complètement.",
      ] },
      { title: "BONUS BOUCLIER AU CHOIX DU NUMÉRO", bullets: [
        "Disponible uniquement avec **1er lancer = choisir son numéro**.",
        "Double : numéro choisi + **bouclier 2 tours**.",
        "Triple : numéro choisi + **bouclier 3 tours**.",
        "BULL : **choix libre du numéro** + bouclier 2 tours.",
        "DBULL : **choix libre du numéro** + bouclier 3 tours.",
      ] },
      { title: "MISS = AUTO-HIT", body: "Si cette variante est activée, toute fléchette enregistrée **MISS** retire automatiquement **1 vie au joueur actif**." },
      { title: "RÉSURRECTION", bullets: [
        "Principe : si un joueur vivant touche le **numéro d’un joueur DEAD**, il peut le faire revenir selon le mode choisi.",
        "**OFF** : aucune résurrection.",
        "**1 Joueur (1×)** : une seule résurrection est autorisée dans toute la partie ; un seul joueur au total peut revenir une fois.",
        "**All (1×)** : chaque joueur peut être ressuscité **une seule fois maximum**.",
        "**All (illimité)** : chaque joueur peut être ressuscité autant de fois que nécessaire.",
        "Le nombre de vies rendu au joueur ressuscité est réglable de **1 à 6 vies**.",
        "Après une résurrection, une **protection blanche temporaire** reste active jusqu’au prochain tour du joueur ; le contour blanc permet ensuite d’identifier qu’il a déjà été ressuscité.",
      ] },
      { title: "INCOMPATIBILITÉS / OPTIONS GRISÉES", bullets: [
        "L’écran grise automatiquement une variante lorsqu’elle entre en conflit avec une autre option active.",
        "Auto-pénalité multiplicateur nécessite Auto-pénalité ON.",
        "BULL soins est incompatible avec Vol de vies et, sans rotation adaptée, avec BULL dégâts.",
        "DBULL bouclier et DBULL désarmement sont exclusifs sans Rotation DBULL.",
        "Blind Killer est incompatible avec l’attribution au 1er lancer.",
      ] },
    ],
  },

  cricket: {
    rules: [
      { title: "CIBLES", body: "Le Cricket se joue sur 15, 16, 17, 18, 19, 20 et Bull. Chaque cible demande **3 marques** pour être fermée." },
      { title: "MARQUES", body: "Simple = 1 marque, Double = 2 marques, Triple = 3 marques. Pour le Bull, 25 vaut 1 marque et 50 vaut 2 marques." },
      { title: "POINTS", body: "En mode Points, une fois une cible fermée de ton côté, les touches supplémentaires marquent des points tant que l’adversaire ne l’a pas lui aussi fermée. En mode Sans points, seules les fermetures comptent." },
      { title: "VICTOIRE", body: "Il faut fermer toutes les cibles et respecter la condition de score de la variante active. En équipe, les partenaires partagent la progression de leur camp." },
    ],
    configuration: [
      { title: "PARTICIPANTS", bullets: ["**SOLO** : 2 à 4 joueurs.", "**2v2** : exactement 4 joueurs, avec 2 joueurs en Team A et 2 en Team B.", "Des bots peuvent être ajoutés pour compléter la sélection."] },
      { title: "MODE DE SCORE", bullets: ["**POINTS** : les touches au-delà de la fermeture peuvent scorer tant que l’adversaire n’a pas fermé.", "**SANS** : partie sans comptage de points supplémentaires."] },
      { title: "NOMBRE MAX DE TOURS", bullets: ["10 tours", "15 tours", "20 tours"] },
      { title: "PREMIER JOUEUR", body: "L’option **Premier joueur tourne** peut changer le joueur qui ouvre à chaque nouvelle manche." },
      { title: "ORDRE DE DÉPART", bullets: ["**CHOISI** : conserve l’ordre sélectionné.", "**ALÉA** : ordre de départ aléatoire."] },
      { title: "DARTSET", body: "Un identifiant de set de fléchettes peut être associé à la partie pour l’historique et les statistiques." },
    ],
  },

  shanghai: {
    rules: [
      { title: "PRINCIPE", body: "Chaque round impose une cible. Dans l’ordre classique, on joue 1, puis 2, puis 3, etc. Seules les touches du numéro actif marquent." },
      { title: "VALEUR DES TOUCHES", body: "Sur la cible du round : Simple vaut la valeur du secteur, Double ×2 et Triple ×3. Les autres numéros ne rapportent rien." },
      { title: "SHANGHAI", body: "Un **Shanghai** consiste à toucher Simple + Double + Triple du numéro actif au cours de la même volée de 3 fléchettes." },
      { title: "VICTOIRE", body: "Avec la règle Shanghai ou points, un Shanghai donne la victoire immédiate ; sinon le meilleur total gagne à la fin. En Points seulement, il n’y a pas de victoire immédiate : seul le total final compte." },
    ],
    configuration: [
      { title: "PARTICIPANTS", body: "Sélection des profils et bots disponibles ; la partie demande au moins deux participants." },
      { title: "TOURS", bullets: ["10 tours", "15 tours", "20 tours"] },
      { title: "ORDRE DES CIBLES", bullets: ["**Chronologique** : progression dans l’ordre des numéros.", "**Aléatoire** : ordre mélangé une fois au lancement et conservé pendant la partie."] },
      { title: "RÈGLE DE VICTOIRE", bullets: ["**Shanghai ou points** : Shanghai = victoire immédiate, sinon total de points.", "**Points seulement** : aucun Shanghai immédiat, classement uniquement au total."] },
      { title: "AUDIO", bullets: ["**Bruitages** ON/OFF.", "**Voix IA** ON/OFF."] },
    ],
  },

  five_lives: {
    rules: [
      { title: "OBJECTIF", body: "Rester le dernier joueur qui possède encore des vies." },
      { title: "PRINCIPE", body: "Le score de référence est la volée précédente. À ton tour, tu dois faire **strictement plus** avec ta propre volée." },
      { title: "ÉCHEC", body: "Si tu ne dépasses pas le score de référence, tu perds une vie. À 0 vie, tu es éliminé." },
      { title: "NOUVELLE RÉFÉRENCE", body: "Une volée réussie devient le nouveau score à battre pour le joueur suivant." },
      { title: "VICTOIRE", body: "Le dernier joueur encore en vie gagne la partie." },
    ],
    configuration: [
      { title: "PARTICIPANTS", bullets: ["Au moins 2 joueurs.", "Profils locaux et bots PRO/personnalisés peuvent être sélectionnés.", "Il n’y a pas de mode équipes sur cet écran."] },
      { title: "VIES DE DÉPART", bullets: ["3", "4", "5", "6", "7", "8", "9", "10"], note: "Le nombre choisi est identique pour tous les joueurs." },
      { title: "ORDRE DE DÉPART", bullets: ["**Aléatoire** : le premier joueur et l’ordre sont tirés au sort.", "**Conserver l’ordre** : garde l’ordre de sélection."] },
      { title: "MODE DE SAISIE", bullets: ["**KEYPAD** : saisie de chaque fléchette via Simple / Double / Triple.", "**CIBLE** : saisie directe en touchant la zone atteinte sur la cible interactive."] },
    ],
  },

  scram: {
    rules: [
      { title: "OBJECTIF", body: "SCRAM oppose deux camps sur les cibles 15 à 20, avec Bull en option. Après deux phases, le joueur ou l’équipe avec le plus de points gagne." },
      { title: "PHASE 1", body: "Le **Bloqueur** ferme les cibles en 3 marques : Simple = 1, Double = 2, Triple = 3. Le **Scoreur** marque uniquement sur les cibles qui ne sont pas encore fermées." },
      { title: "PHASE 2", body: "Les rôles s’inversent et le nouveau Bloqueur repart avec un tableau de fermetures vierge." },
      { title: "BULL", body: "Si le Bull est activé, il fait partie des cibles à fermer et sur lesquelles le Scoreur peut marquer tant qu’il reste ouvert." },
      { title: "VICTOIRE", body: "À la fin de la deuxième phase, le total de points le plus élevé gagne. Une égalité reste possible." },
    ],
    configuration: [
      { title: "BOTS IA", body: "Difficulté : **Facile / Normal / Difficile**." },
      { title: "RÈGLES", bullets: ["Bull inclus ou non.", "Choix du premier bloqueur.", "Cap de rounds par phase."] },
      { title: "SAISIE", bullets: ["Keypad compact.", "Cible interactive."] },
    ],
  },

  shooter: {
    rules: [
      { title: "OBJECTIF", body: "SHOOTER est une course de précision : chaque joueur ou équipe doit terminer sa séquence de cibles avant les autres." },
      { title: "MARKS", body: "Sur la cible active : Simple = 1 mark, Double = 2, Triple = 3. Bull = 1 et Double Bull = 2. Le nombre de marks nécessaires dépend de la configuration." },
      { title: "POINTS", body: "Chaque fléchette valide ajoute également sa valeur réelle au score ; une fléchette hors cible ne rapporte rien." },
      { title: "VOLÉE À ZÉRO", body: "Une volée sans touche valide peut ne rien faire, retirer des points ou faire reculer d’un mark selon la règle choisie." },
      { title: "VICTOIRE", body: "Le premier à terminer toute la séquence gagne. Si une limite de rounds est atteinte, le classement départage progression, marks, score puis précision." },
    ],
    configuration: [
      { title: "PARCOURS", bullets: ["Séquence classique 20 → 15.", "Tour 1 → 20.", "PRO : pairs 20 → 2.", "Ordre aléatoire.", "Nombre de cibles configurable."] },
      { title: "ZONE VALIDE", bullets: ["Segment complet Simple / Double / Triple.", "Simple uniquement.", "Double uniquement.", "Triple uniquement."] },
      { title: "VALIDATION", bullets: ["Nombre de marks pour valider.", "Option terminer par Bull.", "Limite de rounds ou illimitée.", "Gestion de l’échec 0/3 et de sa pénalité."] },
      { title: "SAISIE", bullets: ["Keypad X01.", "Cible interactive."] },
    ],
  },

  mario_kart: {
    rules: [
      { title: "OBJECTIF", body: "Faire franchir la ligne d’arrivée à son kart avant les autres. En équipe, les partenaires pilotent le même kart à tour de rôle." },
      { title: "DÉPLACEMENT", body: "Simple = +1 case, Double = +2, Triple = +3, Bull = +4, Double Bull = +5 et Miss = 0." },
      { title: "CASES ARCADE", body: "Selon le style de course, BOOST accélère, BOUCLIER protège, ATTAQUE ralentit un rival et PIÈGE fait reculer. En Sprint, ces effets sont désactivés." },
      { title: "COLLISIONS", body: "Un kart qui termine sur la case d’un rival le repousse d’une case ; un bouclier peut absorber le choc." },
      { title: "VICTOIRE", body: "Le premier kart à atteindre la distance totale gagne. Avec une limite de rounds, le kart le plus avancé est classé premier à la fin." },
    ],
    configuration: [
      { title: "CIRCUIT", bullets: ["30 cases · Court.", "40 cases · Standard.", "50 cases · Long.", "60 cases · Endurance.", "Nombre de tours configurable."] },
      { title: "STYLE DE COURSE", bullets: ["Sprint · pur pilotage.", "Arcade · équilibré.", "Chaos · effets renforcés."] },
      { title: "ARCADE", bullets: ["Cases spéciales.", "Collisions.", "Ordre aléatoire.", "Limite de rounds ou illimitée."] },
      { title: "SAISIE", bullets: ["Keypad X01.", "Cible interactive."] },
    ],
  },

  ocean_control: {
    rules: [
      { title: "OBJECTIF", body: "Détruire tous les navires de la flotte adverse. Les secteurs 1 à 20 correspondent aux vingt zones de l’océan." },
      { title: "FRAPPES", body: "Simple attaque une zone, Double permet une frappe sur deux zones adjacentes et Triple une ligne de trois zones." },
      { title: "SONAR", body: "Le Bull analyse la zone choisie et donne une indication sur les contacts proches lorsque le sonar est actif." },
      { title: "DOUBLE BULL", body: "Le Double Bull déclenche une frappe de précision selon l’option active." },
      { title: "VICTOIRE", body: "La première flotte à remporter le nombre de manches prévu gagne la bataille." },
    ],
    configuration: [
      { title: "ORGANISATION", bullets: ["Joueurs ou équipes.", "Difficulté Recrue / Capitaine / Amiral.", "Niveau des bots Facile / Normal / Difficile."] },
      { title: "PLACEMENT", bullets: ["Automatique ou manuel.", "Numéros de grille dans l’ordre 1–20 ou aléatoires."] },
      { title: "FORMAT", bullets: ["1 manche.", "Best Of 3.", "Best Of 5."] },
      { title: "RÈGLES SPÉCIALES", bullets: ["Sonar au Bull.", "Frappe Double Bull.", "Gestion d’un tir déjà effectué."] },
      { title: "SAISIE", bullets: ["Keypad.", "Cible tactile."] },
    ],
  },

  cargo: {
    rules: [
      { title: "CONTRATS", body: "Tu dois compléter les séries demandées par les contrats pour charger des palettes. Exemple : 4 × S20 représente une série de quatre simples 20." },
      { title: "CARGAISON", body: "Chaque palette validée ajoute du poids ou des colis à la cargaison selon la variante." },
      { title: "SÉRIES", body: "Une série peut exiger un multiplicateur exact ou simplement le même numéro. Selon le réglage, elle peut continuer d’un tour au suivant." },
      { title: "RISQUES", body: "Les erreurs, Miss, marchandises fragiles, urgences et surcharges peuvent annuler ou pénaliser la progression selon la variante." },
      { title: "VICTOIRE", body: "Dans les variantes de cargaison, le meilleur poids/objectif validé remporte la partie ; Livraison compte les colis et ses bonus de palier." },
    ],
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
    rules: [
      { title: "OBJECTIF", body: "Bob’s 27 est un entraînement compétitif des doubles : tu parcours D1, D2, D3 … jusqu’à D20, puis éventuellement Double Bull." },
      { title: "DÉPART", body: "La règle classique démarre à **27 points**." },
      { title: "TOUR", body: "Tu disposes de 3 fléchettes sur le double actif. Chaque double réussi ajoute sa valeur complète au score." },
      { title: "ZÉRO TOUCHE", body: "Si tu ne touches pas du tout le double demandé dans la volée, sa valeur est soustraite une fois du score." },
      { title: "FIN", body: "Après le dernier double, le meilleur score gagne. Selon la variante, passer sous 0 peut éliminer immédiatement ou autoriser la poursuite en négatif." },
    ],
    configuration: [
      { title: "PARCOURS", bullets: ["Score de départ.", "Premier double.", "Dernier double.", "Option terminer par Double Bull."] },
      { title: "SOUS 0", bullets: ["Élimination — classique.", "Continuer en négatif."] },
      { title: "AUTRES OPTIONS", bullets: ["Ordre aléatoire.", "Bots IA et difficulté Facile / Normal / Difficile.", "Keypad X01 ou cible interactive."] },
    ],
  },

  golf: {
    rules: [
      { title: "OBJECTIF", body: "Comme au golf, le but est de terminer le parcours avec le **plus petit total**." },
      { title: "TROU", body: "Chaque trou correspond à une section de la cible, généralement le numéro du trou. Une partie se joue sur 9 ou 18 trous." },
      { title: "LANCERS", body: "Tu peux lancer jusqu’à 3 fléchettes sur un trou et t’arrêter avant. C’est la **dernière fléchette lancée** qui fixe le score du trou." },
      { title: "SCORE CLASSIQUE", body: "Double = 1 coup, Triple = 3 coups, Simple = 4 coups, Miss = 5 coups." },
      { title: "VICTOIRE", body: "Après le dernier trou, le total de coups le plus faible gagne." },
    ],
    configuration: [
      { title: "PARTICIPANTS", bullets: ["Mode équipes activable.", "Nombre d’équipes.", "Bots IA et difficulté Easy / Normal / Hard."] },
      { title: "PARCOURS", bullets: ["9 ou 18 trous.", "Ordre chronologique ou aléatoire.", "Ordre de départ."] },
      { title: "SCORING", bullets: ["Strokes ou Points.", "Pénalité en cas de Miss.", "Affichage de la grille des trous."] },
    ],
  },

  president: {
    rules: [
      { title: "OBJECTIF", body: "Se débarrasser de sa main virtuelle avant les autres. Le premier devient Président, le dernier Trou du cul." },
      { title: "CARTES ET CIBLES", body: "S17 joue une carte 17, D17 une paire de 17, T17 un brelan de 17. Tu as jusqu’à 3 fléchettes pour réussir la cible affichée." },
      { title: "PLI", body: "Après l’ouverture, il faut jouer la même combinaison avec une valeur supérieure. Quand tous les autres passent, le dernier joueur ayant réussi ouvre le pli suivant." },
      { title: "CLASSEMENT ET TAXES", body: "Les rangs de fin de manche déterminent Président, Vice-Président, etc. À la manche suivante, les meilleurs et derniers échangent des cartes selon la taxe prévue." },
      { title: "CHAOS", body: "La variante Chaos peut ajouter Bull joker, Double Bull Coup d’État et T20 Révolution qui inverse l’ordre des valeurs." },
    ],
    configuration: [
      { title: "FORMAT", bullets: ["Nombre de manches.", "Cartes par joueur.", "Copies des cartes 1 à 20.", "Ordre de départ aléatoire."] },
      { title: "MODE", bullets: ["Président classique.", "Président Chaos."] },
      { title: "EFFETS SPÉCIAUX", bullets: ["Bull = Joker simple.", "Double Bull = Coup d’État.", "Triple 20 = Révolution."] },
      { title: "SAISIE / IA", bullets: ["Keypad X01 ou cible interactive.", "Difficulté IA Facile / Normal / Difficile."] },
    ],
  },

  darts_poker: {
    rules: [
      { title: "MARCHÉ", body: "Les secteurs 1 à 20 portent chacun une carte visible. Lorsqu’une carte est gagnée, elle est remplacée dans le marché." },
      { title: "MAIN", body: "Chaque joueur dispose de **6 fléchettes**, jouées une par une, pour construire sa meilleure main de 5 cartes." },
      { title: "POUVOIRS", body: "Simple = carte ; Double = carte + jeton Échange ; Triple = carte + choix entre 2 cartes. Bull donne un choix de 2 cartes et Double Bull un Joker, limité à un Joker par main." },
      { title: "COMBINAISONS", body: "Les mains suivent la hiérarchie du poker : carte haute, paire, double paire, brelan, suite, couleur, full, carré, quinte flush, quinte flush royale." },
      { title: "VICTOIRE", body: "La meilleure main de la manche rapporte un point ; un contrat bonus peut en ajouter un. Le classement final se fait au total de points puis aux victoires." },
    ],
    configuration: [
      { title: "FORMAT", bullets: ["Nombre de manches.", "Fléchettes par main.", "Ordre aléatoire."] },
      { title: "VISIBILITÉ / BONUS", bullets: ["Mains adverses visibles ou masquées.", "Doubles / Triples spéciaux.", "Double Bull = Joker.", "Contrat bonus par manche."] },
      { title: "BOTS / SAISIE", bullets: ["Niveau Débutant / Joueur / Shark.", "Clavier ou cible interactive."] },
    ],
  },

  baseball: {
    rules: [
      { title: "MODE CIBLES", body: "Chaque manche utilise une cible parmi 1 à 20. Sur la cible active : Simple = 1 run, Double = 2 runs, Triple = 3 runs." },
      { title: "ATTAQUE / DÉFENSE", body: "En duel, un joueur attaque pendant que l’autre défend, puis les rôles s’inversent sur la même cible. À plus de deux, cette variante se joue avec exactement deux équipes de même taille." },
      { title: "MISS", body: "Si l’option **Miss = fin du tour** est active, le premier Miss termine immédiatement la volée." },
      { title: "BULL", body: "Selon le mode Bull choisi, Bull et Double Bull peuvent intervenir en attaque, en défense, uniquement en cas d’égalité ou être désactivés." },
      { title: "VICTOIRE", body: "Le plus grand total de runs gagne après les manches prévues ; les égalités peuvent être départagées par des manches supplémentaires selon le format actif." },
    ],
    configuration: [
      { title: "FORMAT DU MATCH", bullets: ["Nombre de manches.", "Manches supplémentaires.", "Maximum supplémentaire.", "Règle de la 7e manche."] },
      { title: "RÈGLES", bullets: ["Ordre de passage aléatoire.", "Miss = fin du tour selon l’option.", "Règle Bull / Double Bull et valeur du Bull."] },
      { title: "VARIANTE", bullets: ["Cibles aléatoires — Baseball.", "Attaque / Défense — cible par manche."] },
      { title: "IA / SAISIE", bullets: ["Facile / Normal / Difficile.", "Keypad ou cible interactive."] },
    ],
  },

  bowling: {
    rules: [
      { title: "OBJECTIF", body: "Reproduire une partie de bowling sur **10 frames** et terminer avec le plus grand score." },
      { title: "LANCER", body: "Une volée de 3 fléchettes correspond à un lancer de bowling ; les impacts sont convertis en quilles abattues selon la table du mode." },
      { title: "STRIKE / SPARE", body: "Selon la règle active, Bull ou Double Bull peut produire un Strike et un Double au second lancer peut produire un Spare." },
      { title: "SCORING", body: "Le score applique les bonus de bowling : Strike et Spare ajoutent les lancers suivants conformément au moteur du mode." },
      { title: "10e FRAME", body: "La dixième frame peut donner des lancers bonus après Strike ou Spare. Le score total le plus élevé gagne." },
    ],
    configuration: [
      { title: "FORMAT", bullets: ["Best Of 1 — 1 partie.", "Best Of 3 — 2 victoires.", "Best Of 5 — 3 victoires."] },
      { title: "CONVERSION DARTS → QUILLES", bullets: ["Niveau Facile — plus de quilles.", "Normal — équilibré.", "Difficile — exigeant.", "Bull / Double Bull = Strike selon l’option.", "Double = Spare au 2e lancer selon l’option."] },
      { title: "AUTRES OPTIONS", bullets: ["Ordre aléatoire.", "Bots IA Facile / Normal / Difficile.", "Keypad X01 ou cible interactive."] },
    ],
  },

  halve_it: {
    rules: [
      { title: "OBJECTIF", body: "Accumuler le plus gros score en réussissant successivement les contrats imposés." },
      { title: "CONTRATS", body: "Seules les fléchettes conformes au contrat de la manche ajoutent leurs points : numéro précis, Double, Triple, Bull ou autre cible du parcours." },
      { title: "3 FLÉCHETTES", body: "Chaque contrat se joue sur une volée de 3 fléchettes. Un numéro accepte ses zones Simple, Double et Triple lorsqu’il n’y a pas de restriction supplémentaire." },
      { title: "HALVE-IT", body: "Si aucune des 3 fléchettes ne réussit le contrat, le score courant est divisé par deux, avec l’arrondi prévu par le mode." },
      { title: "VICTOIRE", body: "Après le dernier contrat, le joueur ou l’équipe avec le total le plus élevé gagne." },
    ],
    configuration: [
      { title: "PARCOURS", bullets: ["Classique · 7 cibles.", "Étendu · 9 cibles.", "Débutant · numéros + Bull.", "Expert · 12 cibles."] },
      { title: "DÉPART", bullets: ["0 point — classique simple.", "Capital fixe.", "Volée libre initiale."] },
      { title: "DIVISION", bullets: ["Arrondi inférieur — standard.", "Arrondi supérieur."] },
      { title: "AUTRES OPTIONS", bullets: ["Ordre aléatoire.", "Bots IA Facile / Normal / Difficile.", "Keypad X01 ou cible interactive."] },
    ],
  },

  prisoner: {
    rules: [
      { title: "OBJECTIF", body: "Être le premier à terminer le tour physique du cadran : 1 → 18 → 4 → 13 → … → 5 → 20." },
      { title: "PROGRESSION", body: "Pour valider la cible active, il faut toucher le simple extérieur, le triple ou le double du numéro demandé." },
      { title: "PRISONNIER", body: "Un simple intérieur ou un Bull/Double Bull peut emprisonner une fléchette : elle devient indisponible jusqu’à libération." },
      { title: "CAPTURE", body: "Toucher la zone de libération d’un prisonnier libère une fléchette. Si elle appartenait à un adversaire, elle peut changer de propriétaire." },
      { title: "ÉLIMINATION / VICTOIRE", body: "Un joueur sans fléchette jouable permanente peut être éliminé. On gagne en terminant le parcours ou en restant le dernier joueur/équipe en jeu selon la situation." },
    ],
    configuration: [
      { title: "PARCOURS", bullets: ["Sens du dartboard — classique.", "Numérique 1 → 20.", "Fléchettes de départ configurables."] },
      { title: "PRISONNIERS / ÉLIMINATION", bullets: ["Miss hors cible = fléchette perdue 1 tour selon l’option.", "Élimination lorsqu’aucune fléchette n’est jouable selon l’option.", "Ordre joueurs aléatoire."] },
      { title: "IA / SAISIE", bullets: ["Facile / Normal / Difficile.", "Keypad X01 + intérieur/extérieur.", "Cible interactive précise."] },
    ],
  },

  loterie: {
    rules: [
      { title: "LOTERIE", body: "Chaque joueur reçoit un ou plusieurs cartons. Une volée produit un total ; toutes les occurrences correspondant à ce total sur les cartons sont révélées." },
      { title: "PLAGE DE TIR", body: "La plage des nombres et le nombre de fléchettes par volée sont adaptés au réglage de la partie et au niveau choisi." },
      { title: "EXPRESS", body: "Dans les variantes Express, une cible exacte est demandée : Simple, Double ou Triple. Le tour s’arrête dès qu’elle est réussie ; selon le mode, le joueur dispose d’un seul essai ou de plusieurs essais." },
      { title: "MISS", body: "Lorsque l’option Miss est utilisée en Express, un Miss peut faire passer le tour immédiatement." },
      { title: "VICTOIRE", body: "Le premier joueur qui complète entièrement un carton remporte la partie." },
    ],
    configuration: [
      { title: "CARTONS", bullets: ["Cartons par participant.", "Cases par carton.", "Carton personnel ou commun à tous."] },
      { title: "MODE / VOLÉE", bullets: ["Loterie ou Express.", "Volée 3 darts ou Libre.", "Simple / Double / Triple selon le réglage."] },
      { title: "EXPRESS", bullets: ["1 fléchette.", "Jusqu’à 3 essais.", "Un échec peut consommer un essai ou passer immédiatement le tour selon la règle."] },
      { title: "AFFICHAGE", bullets: ["Numéros restants masqués ou affichés."] },
    ],
  },

  capital: {
    rules: [
      { title: "CAPITAL DE DÉPART", body: "Avant les contrats, chaque joueur lance 3 fléchettes pour constituer son **Capital**, c’est-à-dire son score de départ." },
      { title: "UN CONTRAT = UNE VOLÉE", body: "Chaque contrat se joue en une volée de 3 fléchettes. Si le contrat est réussi, le total valide de la volée est ajouté ; s’il est raté, le capital est divisé par deux, arrondi à l’entier inférieur." },
      { title: "15 CONTRATS OFFICIELS", body: "Capital, 20, Triple, 19, Double, 18, Side, 17, Suite, 16, Couleur, 15, 57, 14, Centre." },
      { title: "VALIDATION", body: "Chaque contrat possède sa propre condition : numéro précis, multiplicateur, suite, couleur/zone ou centre. Seules les fléchettes qui respectent le contrat servent à sa réussite." },
      { title: "VICTOIRE", body: "En règle officielle, après le dernier contrat, le joueur ou l’équipe avec le Capital le plus élevé gagne." },
    ],
    configuration: [
      { title: "BOTS IA", bullets: ["Auto-play activable.", "Vitesse Très rapide / Rapide / Lent / Très lent.", "Prise de risque Prudente / Normale / Agressive.", "Comportement Easy / Hard / Safe / Aggressive."] },
      { title: "PARTIE", bullets: ["Ordre de départ aléatoire ou ordre de sélection.", "Départ Officiel — 15 contrats — ou Custom."] },
      { title: "VICTOIRE / RÈGLES", bullets: ["Meilleur score — Officiel.", "Score cible.", "Meilleur total — dernier contrat."] },
      { title: "TEMPS / SAISIE", bullets: ["Chrono Off ou 15 / 20 / 30 / 45 / 60 secondes.", "Keypad ou cible."] },
    ],
  },

  darts_firefighter: {
    rules: [
      { title: "OBJECTIF", body: "La brigade doit accomplir l’objectif du scénario : éteindre tous les foyers, survivre jusqu’à la fin des rounds ou protéger les zones critiques jusqu’aux renforts." },
      { title: "EAU", body: "Simple = 1 unité d’eau, Double = 2, Triple = 3. Le surplus refroidit puis protège la zone lorsque la mécanique le permet." },
      { title: "PROPAGATION", body: "Le feu évolue selon la difficulté, le vent et la fréquence de propagation. Une protection peut absorber une propagation." },
      { title: "BULL / DOUBLE BULL", body: "Le Bull agit sur la zone sélectionnée ou prioritaire. Le Double Bull peut appeler le **Canadair** pour une action spéciale multi-zone." },
      { title: "BRIGADE", body: "Les joueurs coopèrent sur la même carte et le même objectif, tout en conservant leurs statistiques individuelles." },
      { title: "FIN DE MISSION", body: "La victoire ou l’échec dépend de l’objectif choisi et de l’état des territoires à la fin de la mission." },
    ],
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

  // RÈGLES = uniquement le fonctionnement du jeu. Les variantes réglables,
  // chemins d'écran et paramètres appartiennent à CONFIGURATION.
  return renderSections([
    { title: "PRINCIPE", body: mode.summary },
    { title: "CONDITION DE VICTOIRE", body: mode.victoryCondition },
  ]);
}

function cleanConfigurationFallback(text: string) {
  return String(text || "")
    .replace(/\s*Condition de victoire\s*:\s*.*?(?=\s+Variantes \/ choix\s*:|$)/i, "")
    .replace(/\s*Variantes \/ choix\s*:\s*.*$/i, "")
    .trim();
}

export function detailedConfigurationText(mode: AwenaModeLike) {
  const deep = DEEP[mode.id]?.configuration;
  const participantLine = mode.maxPlayers === 1
    ? "Solo."
    : `Jusqu’à ${mode.maxPlayers} joueurs.${mode.supportsTeams ? " Équipes prises en charge." : " Pas d’équipes dans ce mode."}${mode.supportsBots ? " Bots IA pris en charge." : " Pas de bots IA dans ce mode."}`;

  const configOnly = (deep?.length ? deep : [{ title: "OPTIONS DISPONIBLES", body: cleanConfigurationFallback(mode.configuration) }])
    .filter((section) => !/^CONDITION DE VICTOIRE$/i.test(section.title.trim()));

  const sections: Section[] = [
    { title: `CONFIGURATION — ${mode.label.toUpperCase()}`, body: participantLine },
    ...configOnly,
  ];
  if (mode.variants?.length && !configOnly.some((section) => /variante/i.test(section.title))) {
    sections.push({ title: "VARIANTES / CHOIX DE CONFIGURATION", bullets: mode.variants });
  }
  return renderSections(sections);
}
