import type { AwenaAction, AwenaReply } from "./awena.types";

type DeepEntry = {
  id: string;
  title: string;
  aliases: string[];
  text: string;
  route?: string;
};

const STOP = new Set([
  "a","ai","au","aux","avec","ce","ces","cette","cest","ca","de","des","du","dans","et","est","il","elle","en","je","la","le","les","ma","mais","me","mes","mon","ne","nous","on","ou","pour","que","quel","quelle","quels","quelles","qui","quoi","se","son","sur","ta","te","tes","ton","tu","un","une","vos","votre","y",
  "comment","pourquoi","quoi","faire","sert","signifie","veut","dire","fonctionne","explique","expliquer","moi","application","appli"
]);

function norm(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[_/\\-]+/g, " ")
    .replace(/[^a-z0-9%+\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string) {
  return norm(value).split(" ").filter((token) => token.length > 1 && !STOP.has(token));
}

const ENTRIES: DeepEntry[] = [
  {
    id: "account-local-cloud",
    title: "Compte local vs compte en ligne",
    aliases: ["compte local", "compte en ligne", "compte cloud", "difference compte local compte en ligne", "profil local compte"],
    text: "## COMPTE LOCAL ET COMPTE EN LIGNE\nUn **profil local** sert à jouer et conserver des données sur l'appareil. Les fonctions de compte en ligne servent à l'authentification, à la continuité de compte et aux fonctions réseau prévues.\n\n## À RETENIR\n- jouer localement ne nécessite pas que chaque joueur possède un compte en ligne ;\n- les données lourdes de jeu restent gérées par les mécanismes de stockage / sauvegarde de l'application ;\n- une connexion en ligne ne remplace pas automatiquement une sauvegarde locale ou externe.\n\n> Pour une question sur une perte de données, précise si tu parles du profil, de l'historique, des médias ou d'une sauvegarde.",
    route: "settings",
  },
  {
    id: "email-login",
    title: "Connexion par e-mail",
    aliases: ["connexion email", "se connecter", "login", "connexion compte", "email mot de passe"],
    text: "## CONNEXION\nL'application possède un parcours de connexion / création de compte et des écrans dédiés à l'authentification.\n\n## EN CAS DE PROBLÈME\n- vérifie l'adresse e-mail saisie ;\n- utilise le parcours de réinitialisation si le mot de passe est oublié ;\n- une session en ligne et les données locales sont deux choses différentes : perdre une session ne signifie pas forcément perdre l'historique local.",
    route: "auth_v7_login",
  },
  {
    id: "password-reset",
    title: "Mot de passe oublié / réinitialisation",
    aliases: ["mot de passe oublie", "mot de passe oublié", "reset password", "reinitialiser mot de passe", "changer mot de passe"],
    text: "## MOT DE PASSE OUBLIÉ\nUtilise le parcours de **réinitialisation du mot de passe** depuis les écrans de compte.\n\n## IMPORTANT\nLe lien de réinitialisation agit sur le compte en ligne. Il ne doit pas effacer les profils locaux ni les parties stockées sur l'appareil.",
    route: "auth_reset",
  },
  {
    id: "delete-account-data",
    title: "Suppression du compte",
    aliases: ["supprimer compte", "effacer compte", "delete account", "suppression compte cloud"],
    text: "## SUPPRIMER LE COMPTE\nLa suppression d'un compte en ligne est une action différente du simple nettoyage local.\n\n## AVANT DE SUPPRIMER\nJe recommande d'effectuer une **sauvegarde** des données que tu veux conserver. Les réglages comportent aussi des fonctions de reset local : elles ne doivent pas être confondues avec la suppression du compte cloud.\n\n> Si tu me dis exactement ce que tu veux supprimer — compte, historique, profils, cache ou sauvegarde — je peux t'orienter vers la bonne action.",
    route: "settings",
  },
  {
    id: "active-sport",
    title: "Sport actif",
    aliases: ["sport actif", "changer de sport", "selection sport", "sélection sport", "sport quick switch"],
    text: "## SPORT ACTIF\nMULTISPORTS SCORING peut changer d'univers sportif sans relancer l'application.\n\n## EFFET\nLe sport actif détermine quels menus de jeux, configurations et pages de statistiques sont proposés. Changer de sport ne supprime pas les données des autres sports.\n\n## ACCÈS\nTu peux revenir au choix des sports ou utiliser les commandes de changement rapide prévues dans l'interface.",
    route: "gameSelect",
  },
  {
    id: "country-profile",
    title: "Pays d'un profil",
    aliases: ["pays profil", "drapeau profil", "nationalite profil", "nationalité profil"],
    text: "## PAYS / DRAPEAU\nLes profils et plusieurs BOTS peuvent être associés à un pays. Cette information sert surtout à l'identité visuelle et aux présentations.\n\n## IMPORTANT\nLe pays n'influence pas automatiquement le niveau de jeu ou les statistiques. Pour un BOT officiel, le drapeau doit correspondre à son identité définie dans le catalogue.",
    route: "profiles",
  },
  {
    id: "profile-stars",
    title: "Étoiles / niveau d'un profil",
    aliases: ["etoiles profil", "étoiles profil", "niveau profil", "medaillon etoiles", "médaillon étoiles"],
    text: "## ÉTOILES DE PROFIL\nLes étoiles affichées autour ou au-dessus d'un médaillon correspondent à une **évaluation / progression calculée par l'application**, distincte d'un simple nombre de parties.\n\n## SI LE RÉSULTAT SEMBLE ÉTRANGE\nIl faut vérifier les sources réellement utilisées par le calcul : historique lié au profil, modes pris en compte et données disponibles. Un profil ayant peu joué dans un mode peut quand même posséder des données provenant d'autres modes.",
    route: "profiles",
  },
  {
    id: "linked-profile",
    title: "Liaison profil / historique",
    aliases: ["profil lie historique", "profil lié historique", "stats mauvais profil", "parties rattachees profil", "parties rattachées profil"],
    text: "## LIEN ENTRE PROFILS ET PARTIES\nLes statistiques dépendent de l'identifiant du joueur enregistré dans chaque partie. L'application possède des mécanismes de liaison / normalisation pour retrouver les parties d'un même profil.\n\n## POURQUOI C'EST IMPORTANT\nDeux profils portant le même nom ne doivent pas être fusionnés au hasard. Inversement, une ancienne partie peut devoir être rattachée au bon profil pour apparaître dans ses statistiques.",
    route: "stats",
  },
  {
    id: "indexeddb",
    title: "IndexedDB / stockage local",
    aliases: ["indexeddb", "base locale", "stockage navigateur", "donnees locales", "données locales"],
    text: "## STOCKAGE LOCAL\nL'application utilise une base locale de type **IndexedDB** pour conserver les données importantes sur l'appareil.\n\n## CE QUE CELA IMPLIQUE\n- les parties peuvent rester disponibles sans Internet ;\n- vider les données du navigateur / de l'application peut supprimer ce stockage si aucune sauvegarde n'existe ;\n- une sauvegarde externe reste utile même si IndexedDB fonctionne correctement.",
    route: "settings",
  },
  {
    id: "persistent-storage",
    title: "Persistance du stockage",
    aliases: ["stockage persistant", "persistance navigateur", "storage persistent", "quota stockage"],
    text: "## STOCKAGE PERSISTANT\nL'application demande au système de conserver durablement son espace local lorsque la plateforme le permet.\n\n## LIMITES\nLa persistance réduit le risque d'éviction automatique, mais ce n'est **pas une sauvegarde**. Une suppression manuelle des données, un reset ou un changement d'appareil nécessite toujours une sauvegarde / restauration.",
    route: "settings",
  },
  {
    id: "storage-quota",
    title: "Quota de stockage",
    aliases: ["quota stockage", "espace libre", "stockage plein", "plus de place", "memoire stockage"],
    text: "## QUOTA DE STOCKAGE\nLes réglages peuvent afficher l'espace utilisé, le quota estimé et l'espace restant.\n\n## SI LE STOCKAGE EST PRESQUE PLEIN\nLes médias — avatars, photos de fléchettes, caches — peuvent peser plus lourd que les textes ou scores. Sauvegarde les données importantes avant tout nettoyage.",
    route: "settings",
  },
  {
    id: "export-import",
    title: "Export / import",
    aliases: ["export import", "exporter donnees", "importer donnees", "fichier historique", "export historique"],
    text: "## EXPORT / IMPORT\nL'application possède des mécanismes d'export et d'import pour déplacer ou sauvegarder les données.\n\n## BONNE PRATIQUE\n- exporte avant une grosse mise à jour ou un reset ;\n- conserve une copie hors du téléphone ;\n- lors d'un import, vérifie que le fichier correspond bien au format attendu par la version actuelle.",
    route: "sync_center",
  },
  {
    id: "external-backup",
    title: "Sauvegarde fichier externe",
    aliases: ["sauvegarde externe", "usb", "hdd", "fichier externe", "ordinateur sauvegarde"],
    text: "## SAUVEGARDE EXTERNE\nUne sauvegarde peut être conservée sous forme de fichier sur un ordinateur, un disque, une clé USB ou un emplacement monté.\n\n## AVANTAGE\nElle reste indépendante du stockage interne de l'application. C'est particulièrement utile avant un reset, une réinstallation ou un changement d'appareil.",
    route: "settings",
  },
  {
    id: "nas-sync",
    title: "Synchronisation NAS",
    aliases: ["nas sync", "nas", "sauvegarde nas", "push nas", "pull nas"],
    text: "## NAS\nLe projet prévoit une destination NAS pour les sauvegardes / synchronisations lorsqu'elle est configurée.\n\n## PUSH / PULL\n- **Push** : envoyer l'état local vers la destination ;\n- **Pull** : récupérer l'état distant ;\n- une comparaison doit éviter d'écraser aveuglément la version la plus récente.\n\n> Si le NAS n'est pas configuré, les fonctions associées ne peuvent pas fonctionner.",
    route: "sync_center",
  },
  {
    id: "r2-backup",
    title: "Sauvegarde Cloudflare R2",
    aliases: ["r2 backup", "cloudflare r2", "sauvegarde r2", "cloud backup"],
    text: "## CLOUDFLARE R2\nR2 est utilisé comme destination de sauvegarde cloud dans les fonctions prévues par l'application.\n\n## À NE PAS CONFONDRE\nR2 n'est pas la base locale de jeu. Il sert de copie distante / sécurité lorsque l'option est active et autorisée par le plan concerné.",
    route: "settings",
  },
  {
    id: "media-fallback",
    title: "Médias / avatars de secours",
    aliases: ["avatar ne s affiche pas", "photo ne s affiche pas", "media fallback", "image dartset absente", "image profil absente"],
    text: "## MÉDIAS ET IMAGES\nLes avatars, photos de profils et images de DartSets peuvent suivre un chemin de stockage différent des simples statistiques.\n\n## SI UNE IMAGE MANQUE\nLe profil peut encore être intact tandis que son média ne s'est pas réhydraté. L'application possède des mécanismes de cache et de fallback pour les médias ; un problème d'image ne signifie donc pas forcément que le profil ou le DartSet a disparu.",
    route: "profiles",
  },
  {
    id: "stats-normalization",
    title: "Normalisation des statistiques",
    aliases: ["normalisation stats", "stats normalized", "stats differentes", "stats incoherentes", "stats incohérentes"],
    text: "## NORMALISATION DES STATS\nLes modes n'enregistrent pas tous leurs résultats sous exactement la même forme. Le système de statistiques normalise les historiques avant d'agréger les données.\n\n## CONSÉQUENCE\nUne valeur affichée dans deux écrans doit provenir de la même définition et du même périmètre. Si deux pages affichent des résultats différents, il faut vérifier la source, la période et la métrique utilisées.",
    route: "stats",
  },
  {
    id: "stats-period",
    title: "Périodes statistiques",
    aliases: ["stats 1 mois", "stats semaine", "filtre periode", "filtre période", "depuis un mois"],
    text: "## PÉRIODE\nUne statistique peut être calculée sur tout l'historique ou sur une fenêtre temporelle.\n\n## EXEMPLES\n- 7 derniers jours ;\n- 30 derniers jours ;\n- 3 / 6 / 12 mois ;\n- historique complet.\n\nLa date de la partie doit être enregistrée pour qu'un filtre temporel soit fiable.",
    route: "stats",
  },
  {
    id: "stats-player-vs-team",
    title: "Stats joueur vs équipe",
    aliases: ["stats equipe joueur", "stats équipe joueur", "statistiques equipes", "statistiques équipes", "individuel equipe"],
    text: "## STATS JOUEUR ET ÉQUIPE\nUne partie en équipe peut produire à la fois un résultat collectif et des performances individuelles.\n\n## À RETENIR\n- la victoire peut appartenir au camp ;\n- les impacts, moyennes ou actions peuvent rester attribués à chaque joueur ;\n- un classement équipe ne doit pas être confondu avec un classement individuel.",
    route: "stats",
  },
  {
    id: "dartset-stats",
    title: "Statistiques par DartSet",
    aliases: ["stats dartset", "statistiques flechettes", "statistiques fléchettes", "quel set meilleur", "meilleur dartset"],
    text: "## STATS PAR DARTSET\nLorsque le matériel utilisé est enregistré avec la partie, l'application peut comparer les performances par jeu de fléchettes.\n\n## CONDITION\nLe DartSet doit être correctement lié à la partie. Une ancienne partie sans cette information ne peut pas être attribuée rétroactivement avec certitude.",
    route: "stats",
  },
  {
    id: "online-stats",
    title: "Statistiques Online",
    aliases: ["stats online", "statistiques online", "classement online", "parties test online"],
    text: "## STATS ONLINE\nLes parties Online peuvent alimenter un périmètre de statistiques distinct du local.\n\n## NETTOYAGE\nLe projet possède des mécanismes pour exclure certaines sessions de test afin d'éviter de polluer les classements Online avec des données de développement.",
    route: "stats_online",
  },
  {
    id: "training-stats",
    title: "Statistiques Training",
    aliases: ["stats training", "statistiques entrainement", "statistiques entraînement", "progression training"],
    text: "## STATS TRAINING\nLes entraînements mesurent davantage la **progression** que la victoire.\n\nSelon l'exercice, les métriques peuvent inclure précision, meilleure série, moyenne /3, meilleure volée, réussites, temps ou nombre de fléchettes nécessaires.",
    route: "training",
  },
  {
    id: "friend-request",
    title: "Demandes d'amis",
    aliases: ["demande ami", "ajouter ami", "invitation ami", "friend request"],
    text: "## DEMANDE D'AMI\nLes fonctions sociales distinguent les amis déjà acceptés des demandes en attente.\n\n## FLUX\nRecherche / découverte → demande → acceptation ou refus → relation d'ami. Les fonctions disponibles dépendent de la connexion Online.",
    route: "friends",
  },
  {
    id: "nearby-players",
    title: "Joueurs à proximité",
    aliases: ["joueurs a proximite", "joueurs à proximité", "nearby", "joueurs proches", "autour de moi"],
    text: "## JOUEURS À PROXIMITÉ\nLe module Nearby sert à découvrir des joueurs proches lorsque la fonction réseau / localisation correspondante est disponible.\n\n## CONFIDENTIALITÉ\nUne fonction de proximité ne doit pas être confondue avec l'adresse exacte d'un joueur : l'application doit limiter ce qui est exposé publiquement.",
    route: "friends",
  },
  {
    id: "clubs-online",
    title: "Clubs",
    aliases: ["club", "clubs", "creer club", "rejoindre club"],
    text: "## CLUBS\nLes clubs regroupent des joueurs dans un espace social / communautaire.\n\nSelon les fonctions disponibles, un club peut servir à retrouver des membres, organiser des échanges ou préparer des rencontres. Ce n'est pas la même chose qu'une équipe utilisée dans une partie locale.",
    route: "online",
  },
  {
    id: "online-lobby",
    title: "Salon Online",
    aliases: ["salon online", "lobby", "code salon", "rejoindre partie online", "creer salon"],
    text: "## SALON ONLINE\nUn salon rassemble les participants d'une partie réseau avant le lancement.\n\n## CONTEXTE\nLe code du salon et les paramètres Online doivent survivre au passage vers la configuration puis vers la partie, afin que le match reste rattaché au bon lobby.",
    route: "online",
  },
  {
    id: "online-reconnect",
    title: "Reconnexion Online",
    aliases: ["reconnexion online", "session online perdue", "deconnecte online", "déconnecté online", "rejoindre apres coupure"],
    text: "## RECONNEXION\nUne coupure réseau n'a pas le même effet qu'une partie locale.\n\n## À VÉRIFIER\n- session de compte toujours valide ;\n- salon toujours actif ;\n- connexion réseau ;\n- état de partie encore disponible côté Online.\n\nJe peux t'aider à distinguer un problème de session, de salon ou de réseau si tu me décris l'écran affiché.",
    route: "online",
  },
  {
    id: "messages-chat",
    title: "Messagerie",
    aliases: ["messagerie", "messages", "chat", "conversation ami"],
    text: "## MESSAGERIE\nLa page Messages sert aux échanges entre utilisateurs lorsque les fonctions Online sont disponibles.\n\nElle est distincte du panneau Awena : me parler ici n'envoie aucun message à un autre joueur.",
    route: "messages",
  },
  {
    id: "spectator-viewer",
    title: "Spectateur / Viewer",
    aliases: ["spectateur", "viewer", "mode spectateur", "tablette spectateur", "affichage spectateur"],
    text: "## SPECTATEUR / VIEWER\nLes écrans Viewer et Spectateur permettent d'afficher une partie sur un autre écran ou de suivre un match sans utiliser l'interface principale de saisie.\n\n## DIFFÉRENCE\nLe **host** émet l'état de la partie ; le **viewer / display** le reçoit et l'affiche.",
    route: "spectator",
  },
  {
    id: "cast-host-join",
    title: "Cast Host / Join",
    aliases: ["cast host", "cast join", "rejoindre cast", "code cast", "ecran tv"],
    text: "## CAST\nLe système Cast sépare l'écran qui **héberge / envoie** la partie de l'écran qui **rejoint / affiche**.\n\n## USAGE\n- Host : démarre la diffusion ;\n- Join / Display : rejoint via l'identifiant ou le QR proposé ;\n- le téléphone principal reste responsable du scoring.",
    route: "cast_host",
  },
  {
    id: "camera-phone-companion",
    title: "Téléphone compagnon caméra X01",
    aliases: ["telephone compagnon", "téléphone compagnon", "x01 device", "qr camera x01", "deuxieme telephone camera"],
    text: "## TÉLÉPHONE COMPAGNON X01\nLe projet possède une route publique dédiée au téléphone compagnon. Il sert de **caméra + calibration + envoi d'impacts** vers une session X01 déjà créée.\n\n## IMPORTANT\nCe téléphone n'est pas un second joueur : c'est un périphérique de détection.",
    route: "camera_scoring_setup",
  },
  {
    id: "camera-calibration",
    title: "Calibration caméra",
    aliases: ["calibrer camera", "calibration camera", "points calibration", "camera decalage", "caméra décalage"],
    text: "## CALIBRATION CAMÉRA\nLa calibration apprend au moteur où se trouve la cible dans l'image afin de convertir un impact détecté en zone de scoring.\n\n## SI LES IMPACTS SONT DÉCALÉS\nRefais la calibration avec une image stable, la cible entièrement visible et le moins de mouvement possible.",
    route: "camera_scoring_calibration",
  },
  {
    id: "camera-auto",
    title: "Calibration assistée / automatique",
    aliases: ["calibration automatique", "camera assisted", "calibration assistee", "calibration assistée"],
    text: "## CALIBRATION ASSISTÉE\nLe projet contient des outils de calibration assistée et de correction du mapping de la cible.\n\nL'objectif est de réduire les erreurs manuelles, mais le résultat doit toujours être validé visuellement avant de compter les impacts d'une vraie partie.",
    route: "camera_scoring_calibration",
  },
  {
    id: "score-input",
    title: "Méthodes de saisie",
    aliases: ["methode saisie", "méthode saisie", "keypad cible camera", "clavier cible tactile"],
    text: "## SAISIE DU SCORE\nSelon le mode, l'application peut proposer plusieurs méthodes :\n- **clavier / keypad** ;\n- **cible tactile** ;\n- **caméra assistée** lorsqu'elle est prise en charge ;\n- parfois une saisie vocale dédiée au score.\n\nLa méthode de saisie ne doit pas changer la règle du jeu : elle change seulement la façon d'enregistrer l'action.",
    route: "games",
  },
  {
    id: "voice-score",
    title: "Commande vocale de score",
    aliases: ["commande vocale score", "saisie vocale score", "dicter score", "micro x01"],
    text: "## SAISIE VOCALE\nLa commande vocale de score sert à **enregistrer une valeur de jeu**. Elle est différente de ma voix de synthèse.\n\n## DEUX SYSTÈMES\n- reconnaissance vocale : écoute ce que dit le joueur ;\n- Awena / annonces : produit une voix à partir d'un texte.",
    route: "x01_config_v3",
  },
  {
    id: "checkout-route",
    title: "Route de checkout",
    aliases: ["route checkout", "combinaison checkout", "chemin de sortie", "t20 d16"],
    text: "## ROUTE DE CHECKOUT\nUne route est une suite de cibles permettant de terminer un X01.\n\n## EXEMPLE DE LOGIQUE\nLe choix dépend du score restant, du nombre de fléchettes disponibles et du mode **Simple / Double / Master Out**. Une bonne route cherche aussi à laisser une finition confortable si la première cible est manquée.",
    route: "x01_play_v3",
  },
  {
    id: "score-visit",
    title: "Score d'une volée",
    aliases: ["score volée", "score volee", "meilleure volee", "best visit", "visite darts"],
    text: "## VOLÉE\nUne volée correspond généralement à jusqu'à **3 fléchettes** avant le passage au joueur suivant.\n\nLes statistiques peuvent enregistrer le total de la volée, les impacts individuels et des paliers comme 60+, 100+, 140+ ou 180 selon le mode.",
    route: "stats",
  },
  {
    id: "darts-miss",
    title: "MISS aux fléchettes",
    aliases: ["miss darts", "miss flechettes", "raté fléchette", "rate flechette"],
    text: "## MISS\nUn MISS représente une fléchette qui ne marque pas de zone valide selon la saisie du mode.\n\n## STATS\nEnregistrer les MISS permet de calculer une précision plus réaliste. Certains modes donnent aussi un effet de jeu particulier au MISS.",
    route: "games",
  },
  {
    id: "darts-bull-dbull",
    title: "Bull et Double Bull",
    aliases: ["bull dbull", "double bull", "25 50 flechettes", "25 50 fléchettes"],
    text: "## BULL / DOUBLE BULL\n- **Bull** : 25 points ;\n- **Double Bull** : 50 points.\n\nDans certains modes spéciaux, ces zones déclenchent une action différente du simple score : Canadair, bonus, rejouer, objectif spécifique, etc. Il faut donc appliquer la règle du mode actif.",
    route: "games",
  },
  {
    id: "master-out",
    title: "Master Out",
    aliases: ["master out", "sortie master", "double ou triple sortie"],
    text: "## MASTER OUT\nEn Master Out, la dernière fléchette qui amène exactement à zéro doit être un **Double ou un Triple**.\n\nC'est plus permissif que Double Out sur le type de finition, mais plus contraignant que Simple Out.",
    route: "x01_config_v3",
  },
  {
    id: "double-in",
    title: "Double In",
    aliases: ["double in", "commencer double", "entrée double"],
    text: "## DOUBLE IN\nEn Double In, les points ne commencent à descendre qu'après avoir touché un **double**.\n\nLes fléchettes lancées avant l'ouverture ne réduisent pas le score. Une fois l'entrée validée, la partie se poursuit normalement.",
    route: "x01_config_v3",
  },
  {
    id: "training-clock",
    title: "Tour de l'horloge",
    aliases: ["tour de l horloge", "clock training", "around the clock"],
    text: "## TOUR DE L'HORLOGE\nLe principe est de toucher les numéros dans l'ordre, généralement de **1 à 20**, avec des variantes Simple / Double / Triple.\n\n## PERFORMANCE\nL'objectif est de terminer le parcours avec le moins de fléchettes possible ou selon les paramètres de l'exercice.",
    route: "training",
  },
  {
    id: "training-doubleio",
    title: "Training Double In / Double Out",
    aliases: ["training double in out", "doubleio", "double in double out training", "dido training"],
    text: "## DOUBLE IN / DOUBLE OUT — TRAINING\nChaque round impose un **double exact** à toucher en trois fléchettes maximum.\n\n- DI : séquence large de doubles ;\n- DO : doubles fréquents de checkout ;\n- DIDO : alterne travail d'entrée et de sortie.\n\nLa précision et la réussite peuvent alimenter les statistiques Training.",
    route: "training",
  },
  {
    id: "training-challenges",
    title: "Challenges Training",
    aliases: ["challenges training", "mini defis training", "mini défis training"],
    text: "## CHALLENGES\nLe pack contient plusieurs mini-défis solo, par exemple des séries de doubles, une séquence Bull → T20 → D20 ou un checkout à 40.\n\nLes statistiques peuvent conserver réussite, précision et progression par défi.",
    route: "training",
  },
  {
    id: "training-ghost",
    title: "Ghost Mode",
    aliases: ["ghost mode", "training ghost", "fantome darts", "fantôme darts"],
    text: "## GHOST MODE\nTu affrontes un **fantôme de moyenne configurable** pendant un nombre défini de volées.\n\nLe score théorique du Ghost progresse à chaque volée. À la fin, ta moyenne /3 doit atteindre ou dépasser la sienne pour réussir l'exercice.",
    route: "training",
  },
  {
    id: "training-precision",
    title: "Precision Gauntlet",
    aliases: ["precision gauntlet", "training precision", "parcours precision"],
    text: "## PRECISION GAUNTLET\nUne cible exacte est imposée à chaque étape : Simple, Double, Triple, Bull ou Double Bull.\n\nUne touche correcte fait avancer ; les erreurs consomment la tolérance prévue. L'objectif est de terminer le parcours avec le moins de fléchettes possible.",
    route: "training",
  },
  {
    id: "training-repeat",
    title: "Repeat Master",
    aliases: ["repeat master", "training repeat", "serie meme cible", "série même cible"],
    text: "## REPEAT MASTER\nTu dois toucher plusieurs fois de suite **la même cible exacte**.\n\n- SOFT : une erreur remet la série à zéro ;\n- HARDCORE : la première erreur termine la session.\n\nLa meilleure série et la précision servent de références de progression.",
    route: "training",
  },
  {
    id: "training-superbull",
    title: "Super Bull Training",
    aliases: ["super bull training", "training super bull", "bull training"],
    text: "## SUPER BULL — TRAINING\nExercice centré sur le milieu de cible :\n- Bull = 25 ;\n- Double Bull = 50 ;\n- les autres zones sont considérées comme ratées pour ce drill.\n\nTu dois atteindre l'objectif avant la limite de fléchettes.",
    route: "training",
  },
  {
    id: "training-time-attack",
    title: "Time Attack",
    aliases: ["time attack darts", "training time attack", "chrono darts"],
    text: "## TIME ATTACK\nScoring solo sous chronomètre. Le temps démarre avec la première volée et tu cherches le plus de points possible pendant **30, 60 ou 120 secondes** selon le choix.\n\nLes métriques prévues incluent moyenne /3, meilleure volée et paliers 100+ / 140+ / 180.",
    route: "training",
  },
  {
    id: "battle-royale",
    title: "Battle Royale",
    aliases: ["battle royale darts", "regles battle royale", "configuration battle royale"],
    text: "## BATTLE ROYALE\nMode d'élimination multi-joueurs. Les tours appliquent la pression jusqu'à ce qu'il ne reste plus qu'un joueur.\n\n## CONFIGURATION\nLe mode accepte des BOTS IA et fonctionne sans équipes dans le registre actuel. Les règles exactes de vie / élimination sont celles proposées dans sa configuration.\n\n> Pour une option précise affichée à l'écran, demande-moi son nom : je peux lire les contrôles visibles.",
    route: "battle_royale",
  },
  {
    id: "warfare",
    title: "Warfare",
    aliases: ["warfare darts", "regles warfare", "soldats warfare", "friendly fire warfare"],
    text: "## WARFARE\nJeu par camps : chaque camp possède des **soldats / cibles à protéger**.\n\n## ACTIONS\nToucher une cible ennemie blesse ou élimine selon la règle Simple / Double / Triple. Les variantes prévues peuvent inclure friendly fire, soin ou résurrection.\n\n## VICTOIRE\nLe camp qui élimine les forces adverses remporte la partie selon la configuration active.",
    route: "warfare_config",
  },
  {
    id: "football-darts",
    title: "Darts Football",
    aliases: ["darts football", "football flechettes", "football darts", "golden goal darts", "penalties darts"],
    text: "## DARTS FOOTBALL\nLe mode simule un match avec possession, attaque, défense, tirs, gardien et buts.\n\n## VARIANTES ACTUELLES\n- **Match** : deux mi-temps ;\n- **Golden Goal** : premier but décisif ;\n- **Tirs au but** : cinq tentatives puis mort subite ;\n- **Classic** : version simplifiée autour du Bull / Double.\n\n## CONFIGURATION\nDuel 1 contre 1 ou deux équipes, BOTS IA, difficulté, tours par mi-temps, gestion de l'égalité, gardien, perte de possession sur volée vide et méthode de saisie.",
    route: "football_config",
  },
  {
    id: "territories",
    title: "TERRITORIES",
    aliases: ["territories", "departements darts", "départements darts", "forteresses territories", "territoire darts"],
    text: "## TERRITORIES\nLe mode utilise une carte composée de territoires portant chacun une **valeur cible unique**.\n\n## CLASSIQUE\nUn score exact peut capturer un territoire libre ou adverse selon la règle active.\n\n## FORTERESSES\nChaque camp commence avec une répartition équilibrée. Réaliser exactement la valeur d'un territoire allié peut y placer une forteresse. Une attaque exacte brise d'abord une forteresse adverse avant la conquête.\n\n## CONFIGURATION\nLe mode gère joueurs / équipes / BOTS, sélection libre ou volée directe, rounds, nombre maximal de forteresses et plusieurs conditions de victoire : objectif de territoires, régions, temps, majorité en nombre, majorité en valeur ou conquête totale selon le mode.",
    route: "departements_config",
  },
  {
    id: "batard-mode",
    title: "BÂTARD",
    aliases: ["batard darts", "bâtard darts", "regles batard", "configuration batard"],
    text: "## BÂTARD\nChaque joueur affronte la **même séquence de rounds**. Un round impose une cible ou un type de touche et doit être validé en jusqu'à trois fléchettes.\n\n## ÉCHEC\nLa pénalité peut être désactivée, retirer des points, faire reculer dans la séquence ou imposer de rejouer le round.\n\n## VICTOIRE\n- **Meilleur score** : tout le monde termine et le total le plus élevé gagne ;\n- **Premier au bout** : le premier qui termine toute la séquence gagne.\n\n## CONFIGURATION\nProfils, BOTS, difficulté, presets Classic / Progressif / Punition, règles avancées et éditeur complet de la séquence.",
    route: "batard_config",
  },
  {
    id: "petanque-point-tir",
    title: "Pointer et tirer en pétanque",
    aliases: ["pointer petanque", "tirer petanque", "difference pointer tirer", "pointage tir petanque"],
    text: "## POINTER\nPlacer sa boule le plus près possible du but.\n\n## TIRER\nChercher à frapper une boule adverse pour la déplacer ou la retirer du jeu.\n\n## DANS L'APPLICATION\nLes Trainings Pétanque peuvent distinguer travail du pointage, du tir et séries de précision lorsque l'exercice le permet.",
    route: "petanque_config",
  },
  {
    id: "petanque-score",
    title: "Comptage en pétanque",
    aliases: ["compter points petanque", "score petanque", "qui marque mene"],
    text: "## SCORE D'UNE MÈNE\nÀ la fin d'une mène, seul le camp qui possède la boule la mieux placée marque.\n\nIl marque autant de points qu'il possède de boules mieux placées que la meilleure boule adverse, dans la limite du nombre de boules disponibles pour le format.",
    route: "petanque_play",
  },
  {
    id: "pingpong-service",
    title: "Service au Ping-Pong",
    aliases: ["service ping pong", "alternance service pingpong", "qui sert ping pong"],
    text: "## SERVICE\nLa configuration Ping-Pong prévoit plusieurs logiques de service. La règle choisie détermine quand le service change entre les joueurs / équipes.\n\n## CONSEIL\nPour une partie fidèle aux règles officielles, sélectionne le mode de service correspondant dans la configuration ; pour les variantes maison, utilise l'option proposée par l'écran.",
    route: "pingpong_config",
  },
  {
    id: "pingpong-sets",
    title: "Sets au Ping-Pong",
    aliases: ["sets ping pong", "combien sets pingpong", "best of ping pong"],
    text: "## SETS\nLe match est découpé en sets. La configuration fixe le format et donc le nombre de sets nécessaires pour gagner.\n\nLe score d'un set et la gestion du service sont distincts du nombre total de sets du match.",
    route: "pingpong_config",
  },
  {
    id: "babyfoot-goal",
    title: "But au Baby-foot",
    aliases: ["but baby foot", "goal babyfoot", "score babyfoot"],
    text: "## BUT\nUn but ajoute un point au camp concerné selon les règles du match.\n\n## STATS\nLe système Baby-foot possède des statistiques individuelles / équipes et un résumé de fin de match. Les pénalités ou variantes configurées peuvent modifier le déroulé sans changer l'identité du buteur si cette donnée est enregistrée.",
    route: "babyfoot_play",
  },
  {
    id: "babyfoot-league",
    title: "Ligue Baby-foot",
    aliases: ["ligue babyfoot", "championnat baby foot", "saison babyfoot"],
    text: "## LIGUE BABY-FOOT\nLe module Ligue sert à organiser plusieurs rencontres dans une structure suivie, distincte d'un match isolé.\n\nIl peut conserver des informations de saison, équipes et statistiques agrégées selon les fonctions disponibles.",
    route: "babyfoot_menu",
  },
  {
    id: "molkky-exact",
    title: "Score exact au Mölkky",
    aliases: ["depasser score molkky", "dépasser score molkky", "retour 25 molkky", "score exact molkky"],
    text: "## SCORE EXACT\nAu Mölkky, la configuration peut imposer d'atteindre la cible **exactement**.\n\nAvec l'option classique de dépassement, dépasser la cible renvoie le joueur à **25 points**. Cette règle peut être activée / désactivée dans le mode personnalisé selon l'écran.",
    route: "molkky_config",
  },
  {
    id: "dice-bank",
    title: "Bank / sécuriser aux dés",
    aliases: ["bank farkle", "securiser points farkle", "sécuriser points farkle", "bank des"],
    text: "## BANK\nDans un jeu de dés de type Farkle, « Bank » signifie arrêter la prise de risque et **sécuriser les points accumulés pendant le tour**.\n\nContinuer à lancer peut rapporter davantage, mais un lancer sans combinaison valide peut faire perdre les points non sécurisés du tour selon les règles.",
    route: "dice_farkle_config",
  },
  {
    id: "dice-yam-scorecard",
    title: "Feuille de score YAM",
    aliases: ["scorecard yam", "feuille score yams", "categories yam", "catégories yam"],
    text: "## SCORECARD YAM\nAprès les lancers et relances, tu choisis une catégorie de la feuille de score à remplir.\n\nChaque catégorie n'est utilisée qu'une fois. Le total final additionne les catégories et bonus prévus par le mode.",
    route: "dice_yams_config",
  },
  {
    id: "ad-consent",
    title: "Consentement publicitaire",
    aliases: ["consentement pub", "ump", "consent ads", "rgpd publicite", "rgpd publicité"],
    text: "## CONSENTEMENT PUBLICITAIRE\nLe projet possède une gestion de consentement pour les publicités Android.\n\n## IMPORTANT\nLe consentement et l'affichage d'une bannière sont deux étapes différentes : une bannière peut ne pas apparaître même si le consentement est valide, par exemple en absence de réseau ou selon l'emplacement.",
    route: "settings",
  },
  {
    id: "theme-pack",
    title: "Packs de thèmes",
    aliases: ["pack theme", "pack thème", "arenas ambiances", "themes premium", "thèmes premium"],
    text: "## PACKS DE THÈMES\nLes Réglages peuvent proposer des packs visuels plus immersifs que le simple changement de couleur.\n\nUn thème peut agir sur fonds, cartes, accents et ambiance générale. Il ne modifie pas les règles ni les statistiques.",
    route: "settings",
  },
  {
    id: "store-billing",
    title: "Boutique / achats",
    aliases: ["boutique", "achat in app", "billing", "google play billing", "acheter theme"],
    text: "## BOUTIQUE\nLes achats Android passent par le système de facturation Google Play prévu dans le projet.\n\n## À RETENIR\nUne option achetée doit être rattachée à l'état de licence / droit utilisateur, pas seulement à l'affichage local du bouton. Une restauration des achats peut être nécessaire après une réinstallation selon le produit.",
    route: "settings",
  },
  {
    id: "ad-awena",
    title: "Publicité et panneau Awena",
    aliases: ["pub recouvre awena", "ad awena", "banniere awena", "bannière awena"],
    text: "## PUB ET AWENA\nUne bannière AdMob Android est une vue native qui peut passer au-dessus de la WebView.\n\nQuand le panneau Awena est ouvert, les bannières inline doivent être masquées puis restaurées à la fermeture afin d'éviter qu'elles traversent le dialogue.",
    route: "settings",
  },
  {
    id: "slow-profiles",
    title: "Profils lents",
    aliases: ["profils lent", "profils lents", "chargement profils long", "freeze profils"],
    text: "## PROFILS LENTS\nL'affichage des profils peut devenir coûteux si chaque carte recharge des médias, statistiques ou données de stockage au même moment.\n\n## PISTES INTÉGRÉES AU PROJET\nL'application possède des caches d'avatars / médias, des agrégats statistiques et des outils de diagnostic. L'objectif est d'afficher d'abord le contenu léger, puis de charger les éléments lourds sans bloquer la navigation.\n\n> Si tu me montres l'écran et le moment exact du freeze, je peux distinguer chargement média, historique ou rendu React.",
    route: "profiles",
  },
  {
    id: "empty-stats",
    title: "Statistiques vides",
    aliases: ["stats vides", "aucune statistique", "statistiques absentes", "historique mais pas stats"],
    text: "## STATS VIDES\nUne page de statistiques peut être vide si :\n- aucune partie compatible n'est enregistrée ;\n- le mode ou le profil n'est pas reconnu par la normalisation ;\n- la métrique n'était pas enregistrée dans les anciennes parties ;\n- un filtre de période / joueur exclut les données.\n\n## PREMIER CONTRÔLE\nVérifie d'abord que la partie apparaît dans l'**Historique**. Si elle y est, le problème se situe ensuite dans le rattachement ou l'agrégation.",
    route: "stats",
  },
  {
    id: "app-crash",
    title: "Application qui plante",
    aliases: ["appli plante", "application plante", "crash", "ecran erreur", "écran erreur"],
    text: "## CRASH\nL'application possède des garde-fous React et des outils de capture d'erreurs afin d'afficher le problème plutôt qu'un écran vide.\n\n## POUR DIAGNOSTIQUER\nLe message exact, la page active et l'action juste avant le crash sont les informations les plus utiles. Un crash JavaScript, un crash natif Android et une erreur réseau ne se corrigent pas de la même façon.",
    route: "settings",
  },
  {
    id: "navigation-freeze",
    title: "Navigation qui freeze",
    aliases: ["navigation lente", "freeze navigation", "page lente", "menu lent"],
    text: "## NAVIGATION LENTE\nLa navigation doit éviter de refaire des lectures lourdes de base, de médias et de statistiques à chaque changement de page.\n\nLe projet contient des outils de performance, de cache et de diagnostic. Si le problème est reproductible sur une page précise, indique-moi le chemin et je peux t'aider à isoler la charge concernée.",
    route: "settings",
  },
  {
    id: "lost-data",
    title: "Données disparues",
    aliases: ["donnees disparues", "données disparues", "profils disparus", "historique perdu", "j ai perdu mes donnees"],
    text: "## DONNÉES DISPARUES\nAvant de réinitialiser quoi que ce soit :\n1. vérifie si les données existent encore dans l'Historique / Profils ;\n2. vérifie les sauvegardes disponibles ;\n3. évite un nouvel import ou reset qui pourrait écraser une copie récupérable ;\n4. distingue profils, historique, médias et compte cloud.\n\nLe projet possède des mécanismes de récupération / restauration : le bon choix dépend de ce qui manque réellement.",
    route: "sync_center",
  },
  {
    id: "wrong-language",
    title: "Langue qui revient",
    aliases: ["langue revient francais", "langue revient français", "langue change toute seule", "préférence langue"],
    text: "## LANGUE QUI CHANGE TOUTE SEULE\nLa langue doit être une préférence globale cohérente entre Réglages et les préférences du profil.\n\nSi un ancien réglage de profil réécrit la langue globale pendant la navigation, c'est un conflit de préférence et non un problème de traduction d'Awena.",
    route: "settings",
  },
  {
    id: "no-awena-sound",
    title: "Awena sans son",
    aliases: ["awena pas de son", "awena silence", "awena ne parle pas", "voix awena muette"],
    text: "## AWENA NE PARLE PAS\nVérifie :\n- voix activée dans Réglages Awena ;\n- volume de l'application / média ;\n- pack vocal local installé pour le français ;\n- absence de mute via l'icône 🔇 ;\n- pour une autre langue, disponibilité d'une voix Android compatible.\n\nLe texte doit rester accessible même si la synthèse vocale est indisponible.",
    route: "settings",
  },
  {
    id: "awena-language",
    title: "Awena et les langues",
    aliases: ["awena anglais", "awena espagnol", "awena autre langue", "awena multilingue"],
    text: "## AWENA MULTILINGUE\nMa base de connaissances reste centralisée pour éviter de maintenir un cerveau différent par langue.\n\nSur Android, une question dans la langue choisie peut être traduite localement vers le français, traitée par ma base, puis la réponse retraduite. En français, j'utilise ma voix neuronale locale ; dans les autres langues, une voix Android adaptée peut lire la réponse.\n\n> Une traduction automatique peut être moins précise sur les noms de modes, acronymes et termes très spécifiques : je conserve autant que possible les noms officiels de l'application.",
    route: "settings",
  },
];

function conceptual(q: string) {
  return /qu est ce|c est quoi|ca veut dire|que veut dire|que signifie|definition|definis|a quoi sert|comment fonctionne|comment faire|comment utiliser|comment regler|comment régler|comment activer|comment desactiver|comment désactiver|comment creer|comment créer|comment modifier|comment supprimer|comment recuperer|comment récupérer|pourquoi|probleme|problème|ne marche pas|marche pas|ne fonctionne pas|lent|lente|plante|crash|difference|différence|ou trouver|où trouver|ou est|où est|que faire/.test(q);
}

function score(q: string, entry: DeepEntry) {
  const normalized = norm(q);
  let result = 0;
  for (const raw of entry.aliases) {
    const alias = norm(raw);
    if (!alias) continue;
    if (normalized === alias) result = Math.max(result, 110);
    else if (normalized.includes(alias)) result = Math.max(result, 74 + Math.min(20, alias.length / 2));
  }
  const qTokens = new Set(tokens(normalized));
  const eTokens = new Set(tokens([entry.title, ...entry.aliases].join(" ")));
  let overlap = 0;
  for (const token of qTokens) if (eTokens.has(token)) overlap += 1;
  result += overlap * 12;
  return result;
}

function action(entry: DeepEntry): AwenaAction[] | undefined {
  if (!entry.route) return undefined;
  return [{
    id: `deep-nav-${entry.id}`,
    label: `Ouvrir ${entry.title}`,
    kind: "navigate",
    route: entry.route,
  }];
}

export function answerAwenaDeepKnowledge(
  question: string,
  rememberedTopic?: string | null,
): AwenaReply | null {
  const q = norm(question);
  if (!q) return null;

  let best: { entry: DeepEntry; score: number } | null = null;
  for (const entry of ENTRIES) {
    const value = score(q, entry);
    if (!best || value > best.score) best = { entry, score: value };
  }

  const rememberedId = String(rememberedTopic || "").replace(/^deep:/, "");
  const remembered = ENTRIES.find((entry) => entry.id === rememberedId);
  const shortFollow = q.split(" ").length <= 9 && /^(et |alors )?(comment|pourquoi|ou|où|quand|combien|peut on|est ce que|et si|quelle difference|quelle différence|ca sert|ça sert|et pour)/.test(q);
  if ((!best || best.score < 34) && remembered && shortFollow) best = { entry: remembered, score: 48 };

  if (!best) return null;
  if (best.score < 36) return null;
  if (best.score < 62 && !conceptual(q) && !shortFollow) return null;

  return {
    knowledgeTopic: `deep:${best.entry.id}`,
    text: best.entry.text,
    actions: action(best.entry),
  };
}

export function awenaDeepKnowledgeCount() {
  return ENTRIES.length;
}
