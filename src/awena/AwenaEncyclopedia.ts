import type { AwenaAction, AwenaReply } from "./awena.types";

export type AwenaEncyclopediaReply = AwenaReply & { knowledgeTopic: string };

type Entry = {
  id: string;
  title: string;
  aliases: string[];
  keywords?: string[];
  text: string;
  route?: string;
  routeLabel?: string;
  related?: Array<{ label: string; prompt: string }>;
};

const STOP = new Set([
  "a","ai","au","aux","avec","ce","ces","cette","cest","c","ca","de","des","du","dans","et","est","il","elle","en","je","la","le","les","ma","mais","me","mes","mon","ne","nous","on","ou","pour","que","quel","quelle","quels","quelles","qui","quoi","se","son","sur","ta","te","tes","ton","tu","un","une","vos","votre","y","comment","pourquoi","quoi","faire","sert","signifie","veut","dire","fonctionne","fonctionnement","explique","expliquer","moi"
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

function ask(id: string, label: string, prompt: string): AwenaAction {
  return { id: `encyclopedia-ask-${id}`, label, kind: "ask", prompt };
}

function navigate(id: string, label: string, route: string): AwenaAction {
  return { id: `encyclopedia-nav-${id}`, label, kind: "navigate", route };
}

function actionList(entry: Entry): AwenaAction[] | undefined {
  const actions: AwenaAction[] = [];
  if (entry.route && entry.routeLabel) actions.push(navigate(entry.id, entry.routeLabel, entry.route));
  for (const related of entry.related || []) actions.push(ask(`${entry.id}-${actions.length}`, related.label, related.prompt));
  return actions.length ? actions.slice(0, 4) : undefined;
}

const ENTRIES: Entry[] = [
  {
    id: "multisports-scoring",
    title: "MULTISPORTS SCORING",
    aliases: ["multisports scoring", "application", "l application", "appli"],
    keywords: ["multisports", "scoring", "application"],
    text: `## MULTISPORTS SCORING
**MULTISPORTS SCORING** est une application de suivi et de scoring pour plusieurs sports et jeux.

## CE QU’ELLE CENTRALISE
- le choix du **sport** et du **mode de jeu** ;
- les **profils**, équipes et BOTS IA ;
- la **configuration** des parties ;
- le **score en direct** ;
- l’**historique**, les statistiques et records ;
- les fonctions **Online**, compétitions, écrans externes et sauvegarde lorsqu’elles sont disponibles.

## MON RÔLE
Je suis l’assistante intégrée de l’application : je peux expliquer les règles, les options, le vocabulaire, guider vers un écran et exploiter les données réellement enregistrées.`,
    related: [
      { label: "Que peux-tu faire ?", prompt: "Que peux-tu faire exactement dans l'application ?" },
      { label: "Quels sports ?", prompt: "Quels sports et jeux sont disponibles ?" },
    ],
  },
  {
    id: "navigation",
    title: "Navigation principale",
    aliases: ["navigation", "barre de navigation", "menus principaux", "menu principal", "trouver une fonction", "aide navigation"],
    keywords: ["navigation", "menu", "accueil", "profils", "jeux", "stats", "reglages"],
    text: `## NAVIGATION PRINCIPALE
La barre de navigation donne accès aux grands espaces de MULTISPORTS SCORING.

## MENUS
- **Accueil** : synthèse du profil et activité.
- **Messages** : messagerie lorsqu'elle est disponible.
- **Profils** : joueurs locaux, identité et BOTS IA.
- **Jeux** : sports, modes et entraînements.
- **Compétitions** : tournois et rencontres structurées.
- **Online** : amis, salons et fonctions réseau.
- **Stats** : historique, statistiques et records.
- **Réglages** : préférences, audio, Awena et maintenance.
- **Écrans** : Cast / affichage externe.

> Dis-moi simplement ce que tu veux faire — par exemple « je veux créer un bot » — et je te donnerai le chemin adapté.`,
    related: [
      { label: "Créer un bot", prompt: "Je veux créer un bot, où dois-je aller ?" },
      { label: "Voir mes stats", prompt: "Où voir mes statistiques ?" },
      { label: "Sauvegarder", prompt: "Où sauvegarder mes données ?" },
    ],
  },
  {
    id: "profile-active",
    title: "Profil actif",
    aliases: ["profil actif", "joueur actif hors partie", "profil principal"],
    keywords: ["profil", "actif", "principal"],
    text: `## PROFIL ACTIF
Le **profil actif** est l’identité de référence utilisée par l’application pour personnaliser l’expérience.

## À QUOI IL SERT
Il permet notamment d’identifier le joueur principal dans les écrans personnels, de rattacher des préférences et d’afficher ses statistiques lorsqu’elles sont disponibles.

## À NE PAS CONFONDRE
Le **profil actif de l’application** n’est pas forcément le **joueur actif d’une partie**. Pendant un match, le joueur actif est simplement celui dont c’est le tour.`,
    route: "profiles",
    routeLabel: "Ouvrir Profils",
  },
  {
    id: "local-profile",
    title: "Profil local",
    aliases: ["profil local", "joueur local", "profils locaux"],
    keywords: ["profil", "local", "joueur"],
    text: `## PROFIL LOCAL
Un **profil local** représente une vraie personne enregistrée sur l’appareil.

## UTILISATION
Il peut être sélectionné dans les modes compatibles, apparaître dans l’historique et recevoir des statistiques personnelles.

## DIFFÉRENCE AVEC UN BOT
Un profil local représente un humain. Un **BOT IA** est un adversaire virtuel simulé par l’application.`,
    route: "profiles",
    routeLabel: "Ouvrir Profils",
  },
  {
    id: "avatar",
    title: "Avatar",
    aliases: ["avatar", "photo de profil", "image de profil"],
    keywords: ["avatar", "photo", "profil", "image"],
    text: `## AVATAR
L’**avatar** est l’image associée à un profil ou à un BOT.

## DANS L’APPLICATION
Il sert à reconnaître rapidement les participants dans les sélecteurs, cartes joueurs, classements, statistiques et écrans de partie.

> Modifier un avatar change l’apparence du profil ; cela ne modifie pas ses statistiques ni ses règles de jeu.`,
    route: "profiles",
    routeLabel: "Ouvrir Profils",
  },
  {
    id: "dartset",
    title: "DartSet",
    aliases: ["dartset", "dart set", "set de flechettes", "mes flechettes", "flechettes du profil"],
    keywords: ["dartset", "flechettes", "equipement", "set"],
    text: `## DARTSET
Un **DartSet** est un set de fléchettes associé à un joueur.

## UTILITÉ
Il permet de représenter l’équipement réellement utilisé et de conserver une fiche visuelle liée au profil.

## À RETENIR
Le DartSet est un **équipement du profil**. Il ne remplace ni le profil, ni le BOT, ni les statistiques de partie.`,
    route: "profiles",
    routeLabel: "Ouvrir Profils",
  },
  {
    id: "team",
    title: "Équipe",
    aliases: ["equipe", "equipes", "team", "camp"],
    keywords: ["equipe", "team", "camp", "joueurs"],
    text: `## ÉQUIPE
Une **équipe** regroupe plusieurs participants sous un même camp lorsque le mode le permet.

## SELON LE MODE
Le score peut être commun à l’équipe ou certaines statistiques peuvent rester individuelles. Les règles exactes dépendent du jeu.

## CONFIGURATION
Si un mode accepte les équipes, sa page de configuration propose normalement le choix des équipes ou la composition des camps.`,
    related: [{ label: "Bots en équipe ?", prompt: "Peut-on mettre des bots dans une équipe ?" }],
  },
  {
    id: "bot",
    title: "BOT IA",
    aliases: ["bot", "bots", "bot ia", "bots ia", "joueur virtuel", "adversaire virtuel"],
    keywords: ["bot", "ia", "virtuel", "adversaire"],
    text: `## BOT IA
Un **BOT IA** est un joueur virtuel contrôlé par l’application.

## SON RÔLE
Il peut remplacer un adversaire humain dans les modes qui prennent les bots en charge. Son comportement est simulé par le moteur du jeu.

## IDENTITÉ
Un bot peut avoir un **nom**, un **avatar**, un **pays** et un **niveau**.

## DIFFÉRENCE AVEC AWENA
Un BOT joue une partie. **Awena l’assistante** répond aux questions et guide l’utilisateur. Awena existe aussi comme personnage BOT jouable, mais ce sont deux fonctions différentes.`,
    route: "profiles_bots",
    routeLabel: "Ouvrir BOTS IA",
    related: [
      { label: "Créer un bot", prompt: "Comment créer un BOT IA ?" },
      { label: "Niveaux", prompt: "Quels sont les niveaux des BOTS IA ?" },
    ],
  },
  {
    id: "bot-level",
    title: "Niveau des BOTS",
    aliases: ["niveau bot", "niveau des bots", "difficulte bot", "difficulte des bots"],
    keywords: ["bot", "niveau", "difficulte"],
    text: `## NIVEAU DES BOTS
Le niveau règle la difficulté générale du joueur virtuel.

## NIVEAUX PRÉVUS
- **Débutant** : accessible pour découvrir.
- **Standard** : joueur loisir régulier.
- **Fort** : adversaire soutenu.
- **Pro** : niveau très solide.
- **Légende** : niveau élite.

## IMPORTANT
Le détail de la simulation peut varier selon le mode : les décisions utiles en X01 ne sont pas les mêmes qu’en Killer ou dans un jeu tactique.`,
    route: "profiles_bots",
    routeLabel: "Gérer les BOTS",
  },
  {
    id: "awena",
    title: "Awena",
    aliases: ["awena", "assistante", "presentatrice"],
    keywords: ["awena", "assistante", "presentatrice"],
    text: `## AWENA
Je suis **Awena**, la présentatrice et assistante de MULTISPORTS SCORING.

## JE PEUX
- expliquer les **règles** et la **configuration** des modes ;
- guider dans les menus ;
- expliquer le vocabulaire ;
- répondre sur les statistiques réellement disponibles ;
- donner des conseils lorsque le contexte de partie est transmis ;
- ouvrir certains écrans ou modes directement.

## LIMITES
Je fonctionne avec les connaissances embarquées et les données réellement enregistrées. Si une statistique ou une option n’existe pas, je dois le dire plutôt que l’inventer.`,
    related: [{ label: "Modes de présence", prompt: "Quelle différence entre Discrète, Active et Coach ?" }],
  },
  {
    id: "history",
    title: "Historique",
    aliases: ["historique", "historique des parties", "ancienne partie", "parties jouees"],
    keywords: ["historique", "partie", "archive"],
    text: `## HISTORIQUE
L’**historique** conserve les parties enregistrées afin de pouvoir les retrouver et reconstruire des statistiques.

## À QUOI IL SERT
- revoir une partie passée ;
- alimenter les statistiques ;
- calculer des classements et records ;
- comparer des périodes.

## IMPORTANT
Une statistique ne peut être calculée que si les données nécessaires ont réellement été enregistrées dans l’historique du mode.`,
    route: "stats",
    routeLabel: "Ouvrir Stats",
  },
  {
    id: "leaderboard",
    title: "Classement",
    aliases: ["classement", "leaderboard", "top 3", "top 5", "meilleur joueur", "pire joueur"],
    keywords: ["classement", "top", "meilleur", "pire", "joueur"],
    text: `## CLASSEMENT
Un classement compare les joueurs sur une **métrique précise**.

## EXEMPLES
- victoires ;
- pourcentage de victoire ;
- moyenne ;
- meilleur checkout ;
- kills ;
- toute autre statistique réellement enregistrée par le mode.

## BONNE QUESTION
Pour une réponse précise, indique si possible le **mode**, la **statistique** et la **période** : par exemple « Top 3 Killer aux kills sur 1 mois ».`,
    route: "stats",
    routeLabel: "Ouvrir Stats",
  },
  {
    id: "win-rate",
    title: "Pourcentage de victoire",
    aliases: ["pourcentage de victoire", "taux de victoire", "win rate", "win%", "win %"],
    keywords: ["victoire", "pourcentage", "taux", "win"],
    text: `## % DE VICTOIRE
Le **pourcentage de victoire** mesure la part des parties gagnées parmi les parties jouées.

## FORMULE
**Victoires ÷ Parties jouées × 100**.

## INTERPRÉTATION
Un joueur peut avoir beaucoup de victoires mais un taux inférieur à un joueur qui a joué moins de parties. Il faut donc choisir la métrique adaptée à la comparaison voulue.`,
  },
  {
    id: "average",
    title: "Moyenne",
    aliases: ["moyenne", "average", "avg", "avg3", "avg3d", "moyenne 3 flechettes"],
    keywords: ["moyenne", "avg", "avg3", "flechettes"],
    text: `## MOYENNE
Une moyenne résume une performance sur plusieurs lancers ou plusieurs parties.

## AVG3 / AVG3D EN X01
L’**AVG3** correspond à une moyenne ramenée à **3 fléchettes**. C’est l’indicateur le plus courant pour comparer le rythme de scoring en X01.

## ATTENTION
Une moyenne calculée « sur 1 mois » doit être basée sur les parties dont la date se trouve dans cette période.`,
  },
  {
    id: "checkout",
    title: "Checkout",
    aliases: ["checkout", "check out", "sortie x01", "finition x01", "finish"],
    keywords: ["checkout", "sortie", "finition", "finish", "x01"],
    text: `## CHECKOUT
En X01, un **checkout** est la combinaison de fléchettes qui permet de terminer exactement le score restant.

## EXEMPLE
Avec un mode **Double OUT**, la dernière fléchette doit terminer sur un double.

## CONSEIL
Une bonne stratégie ne consiste pas seulement à scorer fort : il faut aussi essayer de laisser une sortie confortable pour la volée suivante.`,
    related: [
      { label: "Double OUT", prompt: "Qu'est-ce que le Double OUT ?" },
      { label: "Bust", prompt: "Qu'est-ce qu'un bust en X01 ?" },
    ],
  },
  {
    id: "bust",
    title: "Bust",
    aliases: ["bust", "buste", "tour annule", "vollee annulee"],
    keywords: ["bust", "annule", "x01"],
    text: `## BUST
Un **bust** est une volée invalide en X01.

## PRINCIPE
Selon la règle de sortie active, le joueur peut dépasser zéro ou laisser un score impossible à finir correctement. La volée est alors annulée et le score revient à sa valeur de début de tour.

> Le détail dépend du mode de sortie choisi : Simple OUT, Double OUT ou Master OUT.`,
  },
  {
    id: "simple-double-triple",
    title: "Simple / Double / Triple",
    aliases: ["simple double triple", "simple", "double", "triple", "multiplicateur"],
    keywords: ["simple", "double", "triple", "multiplicateur"],
    text: `## MULTIPLICATEURS D’UNE CIBLE DE FLÉCHETTES
- **Simple** : la valeur du segment est comptée une fois.
- **Double** : la valeur du segment est multipliée par 2.
- **Triple** : la valeur du segment est multipliée par 3.

## EXEMPLE
Un **T20** vaut 60 points ; un **D20** vaut 40 points ; un **S20** vaut 20 points.`,
  },
  {
    id: "bull",
    title: "Bull / Double Bull",
    aliases: ["bull", "double bull", "dbull", "bullseye", "centre"],
    keywords: ["bull", "dbull", "centre", "cible"],
    text: `## BULL
Le **Bull** correspond à la zone extérieure du centre de la cible et vaut généralement 25 points dans les modes de fléchettes classiques.

## DOUBLE BULL
Le **Double Bull** est le centre intérieur et vaut généralement 50 points.

> Certains modes utilisent Bull et Double Bull comme actions spéciales plutôt que comme simple valeur de score.`,
  },
  {
    id: "180",
    title: "180",
    aliases: ["180", "cent quatre vingt", "score maximum vollee"],
    keywords: ["180", "maximum", "vollee"],
    text: `## 180
En fléchettes classiques, **180** est le score maximal réalisable avec une volée de trois fléchettes : **T20 + T20 + T20**.

## DANS LES STATS
L’application peut compter les 180 comme événement de performance lorsqu’un mode enregistre cette information.`,
  },
  {
    id: "visit",
    title: "Volée / Visite",
    aliases: ["volee", "visite", "tour de flechettes", "3 flechettes"],
    keywords: ["volee", "visite", "tour", "flechettes"],
    text: `## VOLÉE / VISITE
Une **volée** — aussi appelée **visite** — correspond au passage d’un joueur à la cible.

Dans beaucoup de modes, elle comporte jusqu’à **3 fléchettes**, mais certains jeux utilisent un nombre différent ou peuvent arrêter la volée plus tôt lorsqu’un objectif est atteint.`,
  },
  {
    id: "leg-set",
    title: "Leg et Set",
    aliases: ["leg", "set", "legs", "sets", "manche x01"],
    keywords: ["leg", "set", "manche", "x01"],
    text: `## LEG
Un **leg** est une manche élémentaire du match.

## SET
Un **set** regroupe plusieurs legs lorsqu’un format en sets est activé.

## EXEMPLE
Un match peut demander plusieurs legs pour gagner un set, puis plusieurs sets pour gagner la rencontre.`,
  },
  {
    id: "best-of",
    title: "Best Of",
    aliases: ["best of", "bo3", "bo5", "bo7", "bo9", "bo11", "bo13", "bo15"],
    keywords: ["best", "bo", "manches"],
    text: `## BEST OF
**Best Of N** signifie que la rencontre se joue sur un maximum de **N manches**, et que le premier à obtenir la majorité nécessaire gagne.

## EXEMPLES
- **BO3** : premier à 2 manches.
- **BO5** : premier à 3 manches.
- **BO7** : premier à 4 manches.

Le nombre N est normalement impair afin qu’il ne puisse pas y avoir d’égalité finale.`,
  },
  {
    id: "best-of-vs-first-to",
    title: "Best Of vs First To",
    aliases: ["difference best of first to", "quelle difference entre best of et first to", "best of ou first to", "best of vs first to", "difference bo ft"],
    keywords: ["difference", "best", "first", "bo", "ft"],
    text: `## BEST OF
**Best Of N** fixe le **nombre maximal de manches**. Il faut en gagner plus de la moitié. Exemple : **BO7 = premier à 4**.

## FIRST TO
**First To N** fixe directement le **nombre de manches à gagner**. Exemple : **First To 4 = premier à 4**.

## DIFFÉRENCE PRATIQUE
**BO7** et **First To 4** produisent donc le même seuil de victoire, mais ils ne l'expriment pas de la même manière.`,
  },
  {
    id: "first-to",
    title: "First To",
    aliases: ["first to", "ft3", "ft5", "ft7", "premier a"],
    keywords: ["first", "ft", "premier"],
    text: `## FIRST TO
**First To N** signifie simplement : **le premier à atteindre N manches / legs / points selon le contexte gagne**.

## DIFFÉRENCE AVEC BEST OF
- **First To 4** : premier à 4.
- **Best Of 7** : maximum 7 manches, ce qui revient aussi à devoir en gagner 4.`,
  },
  {
    id: "in-out",
    title: "IN / OUT du X01",
    aliases: ["simple in", "double in", "master in", "simple out", "double out", "master out", "in out x01"],
    keywords: ["simple", "double", "master", "in", "out", "x01"],
    text: `## RÈGLES D’ENTRÉE — IN
Elles définissent la manière dont le joueur peut commencer à décompter son score.
- **Simple IN** : tout impact valide peut ouvrir.
- **Double IN** : il faut ouvrir avec un double.
- **Master IN** : l’entrée suit la règle Master prévue par le mode.

## RÈGLES DE SORTIE — OUT
Elles définissent la dernière fléchette autorisée pour atteindre exactement zéro.
- **Simple OUT** : toute finition exacte valide.
- **Double OUT** : la dernière fléchette doit être un double.
- **Master OUT** : la sortie suit la règle Master prévue par le mode.`,
  },
  {
    id: "keypad",
    title: "Keypad",
    aliases: ["keypad", "clavier", "pave de saisie", "saisie manuelle"],
    keywords: ["keypad", "clavier", "saisie"],
    text: `## KEYPAD
Le **keypad** est le pavé de saisie utilisé pour enregistrer manuellement les impacts ou le score selon le mode.

## AVANTAGE
Il fonctionne sans caméra ni cible connectée et permet de saisir rapidement Simple, Double, Triple, Bull ou les valeurs prévues par l’écran de jeu.`,
  },
  {
    id: "interactive-target",
    title: "Cible interactive",
    aliases: ["cible interactive", "cible virtuelle", "cible a l ecran"],
    keywords: ["cible", "interactive", "virtuelle"],
    text: `## CIBLE INTERACTIVE
La **cible interactive** permet de toucher directement une représentation de la cible à l’écran pour enregistrer l’impact.

## DIFFÉRENCE AVEC LE KEYPAD
Le keypad demande de sélectionner une valeur ou un multiplicateur. La cible interactive se rapproche davantage du geste consistant à indiquer la zone réellement touchée.`,
  },
  {
    id: "camera-scoring",
    title: "Scoring caméra",
    aliases: ["scoring camera", "camera scoring", "camera", "camerascoring"],
    keywords: ["camera", "scoring", "calibration"],
    text: `## SCORING CAMÉRA
Le **scoring caméra** utilise une caméra pour aider à détecter ou interpréter les impacts sur la cible.

## MISE EN PLACE
Une étape de **configuration / calibration** est nécessaire afin de faire correspondre l’image captée aux zones de score.

## À RETENIR
La précision dépend de la position de la caméra, de l’éclairage, de la calibration et du module utilisé.`,
    related: [{ label: "Calibration", prompt: "Comment fonctionne la calibration caméra ?" }],
  },
  {
    id: "calibration",
    title: "Calibration caméra",
    aliases: ["calibration", "calibrer camera", "calibrage cible"],
    keywords: ["calibration", "camera", "cible"],
    text: `## CALIBRATION
La calibration sert à **aligner l’image de la caméra avec la géométrie réelle de la cible**.

## OBJECTIF
L’application doit savoir où se trouvent les segments, doubles, triples, Bull et Double Bull dans l’image.

## BONNES CONDITIONS
Une caméra stable, une cible bien cadrée et un éclairage régulier facilitent une calibration fiable.`,
  },
  {
    id: "undo",
    title: "Annuler / Undo",
    aliases: ["annuler", "undo", "corriger un lancer", "erreur de saisie"],
    keywords: ["annuler", "undo", "corriger", "erreur", "saisie"],
    text: `## ANNULER
Le bouton **Annuler / Undo** sert à revenir sur une saisie récente lorsque le mode le permet.

## UTILISATION
Il est utile après une erreur de saisie ou un impact mal enregistré.

> La profondeur d’annulation dépend du mode : certains conservent plusieurs étapes, d’autres uniquement la dernière action.`,
  },
  {
    id: "stats",
    title: "Statistiques",
    aliases: ["statistique", "statistiques", "stats", "stats center", "statistics center"],
    keywords: ["stats", "statistique", "performance"],
    text: `## STATISTIQUES
Les statistiques synthétisent les parties enregistrées sous forme d’indicateurs, comparaisons et records.

## TYPES DE DONNÉES
Selon le mode : parties, victoires, taux de victoire, moyennes, meilleurs coups, événements de score, précision, kills, objectifs spécifiques, etc.

## PRINCIPE
Une statistique fiable doit être calculée à partir de données réellement enregistrées. Si un ancien match ne contient pas un champ, ce champ ne peut pas être reconstruit avec certitude.`,
    route: "stats",
    routeLabel: "Ouvrir Stats",
  },
  {
    id: "history-stats-records",
    title: "Historique vs Stats vs Records",
    aliases: ["difference historique stats records", "quelle difference entre historique stats et records", "historique ou statistiques", "stats ou records"],
    keywords: ["difference", "historique", "stats", "records"],
    text: `## HISTORIQUE
L'**historique** contient les parties enregistrées.

## STATISTIQUES
Les **statistiques** calculent des indicateurs à partir de cet historique.

## RECORDS
Les **records** sélectionnent des valeurs remarquables ou des classements parmi ces statistiques.

> En résumé : **historique = données source**, **stats = calculs**, **records = meilleures / pires performances ou classements**.`,
    route: "stats",
    routeLabel: "Ouvrir Stats",
  },
  {
    id: "records",
    title: "Records",
    aliases: ["record", "records", "meilleur record", "record personnel"],
    keywords: ["record", "meilleur", "statistique"],
    text: `## RECORD
Un **record** est une valeur remarquable extraite des statistiques : meilleure moyenne, plus gros checkout, plus de victoires, plus de kills, etc.

## QUESTIONS POSSIBLES
Tu peux me demander un **Top 3**, le meilleur, le pire, une moyenne ou un filtre de période.

## LIMITE
Si le mode n’enregistre pas la donnée demandée, je dois te répondre que cette statistique n’est pas disponible.`,
    route: "stats",
    routeLabel: "Ouvrir Stats",
  },
  {
    id: "training",
    title: "Training",
    aliases: ["training", "entrainement", "s entrainer", "mode entrainement"],
    keywords: ["training", "entrainement", "exercice"],
    text: `## TRAINING
Les modes **Training** sont conçus pour s’entraîner plutôt que pour jouer un match classique.

## OBJECTIFS POSSIBLES
Selon l’exercice, ils peuvent travailler la précision, les doubles, la vitesse, les segments, les sorties ou la régularité.

## STATS
Les exercices compatibles peuvent enregistrer des résultats spécifiques pour suivre la progression.`,
    route: "games",
    routeLabel: "Ouvrir Jeux",
  },
  {
    id: "competition",
    title: "Compétitions",
    aliases: ["competition", "competitions", "tournoi", "tournois", "bracket", "tableau tournoi"],
    keywords: ["competition", "tournoi", "tableau", "match"],
    text: `## COMPÉTITIONS
Le menu **Compétitions** sert à organiser des rencontres structurées et des tournois.

## FLUX GÉNÉRAL
Selon le type de compétition : création, participants ou équipes, composition, tableau, matchs, résultats puis progression jusqu’au classement final.`,
    route: "tournaments",
    routeLabel: "Ouvrir Compétitions",
  },
  {
    id: "online",
    title: "Online",
    aliases: ["online", "en ligne", "multijoueur en ligne", "salon"],
    keywords: ["online", "ligne", "salon", "reseau"],
    text: `## ONLINE
L’espace **Online** regroupe les fonctions réseau disponibles : amis, salons, présences et rencontres compatibles.

## DIFFÉRENCE AVEC LE LOCAL
Une partie locale se joue sur le même appareil. Une fonction Online dépend d’une connexion et du service réseau correspondant.`,
    route: "online",
    routeLabel: "Ouvrir Online",
  },
  {
    id: "friends",
    title: "Amis",
    aliases: ["ami", "amis", "demande ami", "demande d ami", "friend"],
    keywords: ["ami", "demande", "online"],
    text: `## AMIS
Les **amis** sont les contacts utilisés par les fonctions sociales et Online de l’application.

## FONCTIONS
Les écrans dédiés peuvent gérer les relations, demandes d’amis et accès rapides aux interactions compatibles.`,
    route: "online",
    routeLabel: "Ouvrir Online",
  },
  {
    id: "messages",
    title: "Messages",
    aliases: ["message", "messages", "messagerie", "chat"],
    keywords: ["message", "messagerie", "chat"],
    text: `## MESSAGES
Le menu **Messages** regroupe la messagerie de l’application lorsque les fonctions sociales correspondantes sont disponibles.

Il est distinct de ma propre fenêtre de dialogue : me parler à moi n’envoie pas un message à un autre utilisateur.`,
    route: "messages",
    routeLabel: "Ouvrir Messages",
  },
  {
    id: "clubs",
    title: "Clubs",
    aliases: ["club", "clubs"],
    keywords: ["club", "online", "groupe"],
    text: `## CLUBS
Les **clubs** servent à regrouper des utilisateurs autour d’une structure commune lorsque ce module est disponible.

Ils peuvent être utilisés comme point d’organisation sociale ou compétitive selon les fonctions activées dans l’espace Online.`,
    route: "online",
    routeLabel: "Ouvrir Online",
  },
  {
    id: "cast",
    title: "Écrans / Cast",
    aliases: ["cast", "ecrans", "ecran externe", "deuxieme ecran", "second ecran", "spectateur", "viewer"],
    keywords: ["cast", "ecran", "viewer", "spectateur", "diffusion"],
    text: `## ÉCRANS / CAST
Le menu **Écrans** sert à présenter ou diffuser une partie sur un écran distinct.

## PRINCIPE
L’appareil principal conserve le contrôle, tandis qu’un écran viewer / spectateur peut recevoir l’affichage prévu pour le public.

## INTÉRÊT
C’est pratique pour une TV, un écran de club ou un affichage visible par plusieurs joueurs.`,
    route: "cast_host",
    routeLabel: "Ouvrir Écrans",
  },
  {
    id: "backup",
    title: "Sauvegarde",
    aliases: ["sauvegarde", "backup", "sauvegarder", "coffre", "storage vault"],
    keywords: ["sauvegarde", "backup", "coffre", "stockage"],
    text: `## SAUVEGARDE
Une **sauvegarde** protège les données de l’application dans une destination choisie.

## DONNÉES
Le système peut inventorier notamment les parties, statistiques, profils, équipes, bots, images et équipements selon la version du coffre.

## DESTINATIONS
Le projet prévoit plusieurs familles de destination : stockage local, fichier/appareil, support externe ou services distants lorsqu’ils sont configurés.

> Avant une restauration, vérifie toujours la date et la source du snapshot.`,
    route: "storage_vault",
    routeLabel: "Ouvrir le coffre",
  },
  {
    id: "backup-vs-sync",
    title: "Sauvegarde vs Synchronisation",
    aliases: ["difference sauvegarde synchronisation", "quelle difference entre sauvegarde et synchronisation", "backup vs sync", "sauvegarde ou sync"],
    keywords: ["difference", "sauvegarde", "synchronisation", "backup", "sync"],
    text: `## SAUVEGARDE
Une **sauvegarde** crée un point de protection que l'on peut conserver et restaurer plus tard.

## SYNCHRONISATION
Une **synchronisation** cherche plutôt à mettre plusieurs ensembles de données en cohérence.

## CONSEIL
Avant une opération de synchronisation ou de restauration importante, conserver un snapshot de sauvegarde récent réduit le risque de perte de données.`,
    route: "storage_vault",
    routeLabel: "Ouvrir le coffre",
  },
  {
    id: "restore",
    title: "Restauration",
    aliases: ["restauration", "restaurer", "restore", "restaurer sauvegarde"],
    keywords: ["restauration", "restore", "sauvegarde"],
    text: `## RESTAURATION
La **restauration** réinjecte les données d’une sauvegarde dans l’application.

## PRÉCAUTION
Elle peut remplacer ou fusionner des données selon le mécanisme utilisé. Il faut vérifier le snapshot, sa date et sa provenance avant de valider.

> Une sauvegarde récente et vérifiée est préférable avant toute restauration importante.`,
    route: "storage_vault",
    routeLabel: "Ouvrir le coffre",
  },
  {
    id: "sync",
    title: "Synchronisation",
    aliases: ["synchronisation", "synchroniser", "sync", "sync center"],
    keywords: ["sync", "synchronisation", "donnees"],
    text: `## SYNCHRONISATION
La **synchronisation** sert à rapprocher les données de l’appareil avec une autre source configurée.

## DIFFÉRENCE AVEC UNE SAUVEGARDE
Une sauvegarde crée un point de protection. Une synchronisation vise plutôt à mettre des ensembles de données en cohérence.

> Selon la source, une connexion peut être nécessaire.`,
    route: "sync_center",
    routeLabel: "Ouvrir Sync",
  },
  {
    id: "r2",
    title: "Cloudflare R2",
    aliases: ["r2", "cloudflare r2", "cloud r2"],
    keywords: ["r2", "cloudflare", "cloud", "stockage"],
    text: `## CLOUDFLARE R2
**R2** est une destination de stockage cloud utilisée par le projet pour certaines sauvegardes distantes lorsqu’une offre compatible est active.

## DANS L’APPLICATION
Le code prévoit un contrôle d’éligibilité / quota avant les écritures. Si aucune offre autorisée n’est active, les nouvelles écritures R2 doivent rester bloquées.

> Les sauvegardes locales ou sur fichier restent un mécanisme distinct.`,
    route: "storage_vault",
    routeLabel: "Ouvrir le coffre",
  },
  {
    id: "nas",
    title: "NAS",
    aliases: ["nas", "serveur nas", "nas fondateur"],
    keywords: ["nas", "serveur", "stockage"],
    text: `## NAS
Un **NAS** est un stockage réseau. Dans le projet, certaines fonctions peuvent utiliser une destination NAS configurée pour des données ou sauvegardes.

## À RETENIR
Un NAS distant nécessite une connexion au service concerné ; il ne faut pas le confondre avec le stockage local de l’appareil.`,
    route: "storage_vault",
    routeLabel: "Ouvrir le coffre",
  },
  {
    id: "supabase",
    title: "Supabase",
    aliases: ["supabase", "authentification supabase"],
    keywords: ["supabase", "authentification", "compte"],
    text: `## SUPABASE
Dans la configuration actuelle du projet, **Supabase** est utilisé surtout pour l’authentification et des données légères de profil / continuité de compte.

## IMPORTANT
Le texte des réglages précise que les parties, statistiques et sauvegardes lourdes ne doivent pas être envoyées automatiquement dans Supabase.`,
    route: "settings",
    routeLabel: "Ouvrir Réglages",
  },
  {
    id: "offline",
    title: "Mode hors ligne",
    aliases: ["hors ligne", "offline", "sans internet", "sans connexion"],
    keywords: ["offline", "internet", "connexion", "local"],
    text: `## HORS LIGNE
Une grande partie des fonctions locales peut fonctionner sans connexion : jeux locaux, profils locaux, historique local et ma voix une fois son pack installé.

## CONNEXION NÉCESSAIRE
Les fonctions Online, certains téléchargements, la publicité et les services distants de sauvegarde peuvent nécessiter Internet.`,
  },
  {
    id: "theme",
    title: "Thème",
    aliases: ["theme", "apparence", "couleur", "skin", "mode sombre"],
    keywords: ["theme", "apparence", "couleur"],
    text: `## THÈME
Le **thème** modifie l’apparence visuelle de l’application : couleurs, accents et présentation.

## IMPORTANT
Changer de thème ne modifie ni les règles des jeux, ni les résultats, ni les statistiques.`,
    route: "settings",
    routeLabel: "Ouvrir Réglages",
  },
  {
    id: "language",
    title: "Langue",
    aliases: ["langue", "francais", "anglais", "espagnol", "traduction"],
    keywords: ["langue", "francais", "anglais", "espagnol"],
    text: `## LANGUE
La langue de l’interface se règle dans **Réglages**.

## COHÉRENCE
Lorsqu’une langue est changée, les textes traduits, titres et préférences associées doivent rester cohérents entre les écrans.

## AWENA MULTILINGUE
Awena suit la langue choisie dans l'application. En français, elle conserve sa voix neuronale locale. Dans les autres langues, ses réponses peuvent être traduites localement sur Android puis lues avec une voix Android compatible avec la langue sélectionnée.

> Le premier usage d'une nouvelle langue peut nécessiter le téléchargement de son modèle de traduction.`,
    route: "settings",
    routeLabel: "Ouvrir Réglages",
  },
  {
    id: "audio",
    title: "Audio",
    aliases: ["audio", "son", "volume", "musique", "effets sonores", "voix"],
    keywords: ["audio", "son", "volume", "musique", "voix"],
    text: `## AUDIO
Les réglages audio gèrent les sons, musiques et options vocales disponibles.

## AWENA
Ma voix possède ses propres réglages. Pendant une réponse, l’icône **muet** permet d’arrêter la lecture et d’afficher immédiatement tout le texte.`,
    route: "settings",
    routeLabel: "Ouvrir Réglages",
  },
  {
    id: "intro",
    title: "Intro de l’application",
    aliases: ["intro", "introduction", "video intro", "musique intro", "cinematique intro"],
    keywords: ["intro", "video", "musique", "cinematique"],
    text: `## INTRO
L’intro correspond à la séquence visuelle et sonore affichée au lancement lorsque cette option est activée.

## RÉGLAGE
Le projet prévoit un réglage permettant de couper l’intro afin d’arriver directement à l’écran de sélection / accueil concerné.`,
    route: "settings",
    routeLabel: "Ouvrir Réglages",
  },
  {
    id: "ads",
    title: "Publicité / AdMob",
    aliases: ["pub", "publicite", "admob", "annonce test", "banniere pub"],
    keywords: ["pub", "publicite", "admob", "banniere"],
    text: `## PUBLICITÉ
L’application peut afficher des emplacements publicitaires configurés via **AdMob** sur Android.

## DIALOGUE AWENA
Les bannières natives doivent être masquées lorsque mon panneau est ouvert afin de ne pas recouvrir la conversation.

## ANNONCE TEST
Le libellé « annonce test » signale généralement un affichage publicitaire de test dans l’environnement concerné.`,
    route: "settings",
    routeLabel: "Ouvrir Réglages",
  },
  {
    id: "info-dot",
    title: "InfoDot",
    aliases: ["infodot", "info dot", "bouton info", "petit i"],
    keywords: ["infodot", "info", "bouton"],
    text: `## INFODOT
L’**InfoDot** est le petit bouton d’information utilisé dans plusieurs menus pour afficher une aide courte sur un mode ou une fonction.

## AVEC AWENA
Dans les écrans de **configuration** et de **partie**, Awena peut prendre la place de l’InfoDot pour proposer une aide interactive. Dans la liste générale des modes, l’InfoDot classique reste utile pour une consultation rapide.`,
  },
  {
    id: "rules-config-records",
    title: "Règles / Configuration / Records",
    aliases: ["regles configuration records", "difference regles configuration records", "boutons awena"],
    keywords: ["regles", "configuration", "records", "awena"],
    text: `## RÈGLES
Explique **comment fonctionne le jeu**, son objectif et sa condition de victoire.

## CONFIGURATION
Explique **ce que tu peux régler avant de jouer** : participants, équipes, bots, variantes, valeurs et formats disponibles.

## RECORDS
Interroge **les données des parties enregistrées** : classements, meilleurs, pires, moyennes, Top 3, périodes et métriques propres au mode.`,
  },
  {
    id: "petanque-mene",
    title: "Mène en pétanque",
    aliases: ["mene petanque", "mene", "manche petanque"],
    keywords: ["mene", "petanque"],
    text: `## MÈNE
En pétanque, une **mène** est une séquence de jeu qui se termine lorsque toutes les boules prévues ont été jouées et que les points sont attribués.

La partie enchaîne des mènes jusqu’à atteindre la condition de victoire du format choisi.`,
  },
  {
    id: "petanque-carreau",
    title: "Carreau",
    aliases: ["carreau petanque", "carreau"],
    keywords: ["carreau", "petanque", "tir"],
    text: `## CARREAU
En pétanque, un **carreau** désigne un tir réussi où la boule tirée est remplacée très favorablement par la boule du tireur.

Dans les statistiques compatibles, ce type d’action peut être enregistré comme événement spécifique.`,
  },
  {
    id: "molkky-miss",
    title: "MISS au Mölkky",
    aliases: ["miss molkky", "rate molkky", "trois miss molkky"],
    keywords: ["miss", "molkky"],
    text: `## MISS AU MÖLKKY
Un **MISS** signifie qu’aucune quille valide n’a été renversée.

Selon la configuration du mode Mölkky, plusieurs MISS consécutifs peuvent entraîner une pénalité ou une élimination.`,
  },
  {
    id: "farkle-bust",
    title: "Farkle / Bust aux dés",
    aliases: ["farkle bust", "bust farkle", "farkle des"],
    keywords: ["farkle", "bust", "des"],
    text: `## FARKLE
Farkle est un jeu de dés de type **push-your-luck** : tu choisis entre sécuriser les points obtenus ou continuer à lancer pour tenter d’en gagner davantage.

## RISQUE
Si le lancer ne produit aucune combinaison marquante selon les règles du mode, la manche peut se terminer sans sécuriser les points en cours.`,
  },
];

function looksConceptual(q: string) {
  return /qu est ce|c est quoi|ca veut dire|que veut dire|que signifie|definition|definis|a quoi sert|comment fonctionne|difference|pourquoi|comment creer|comment modifier|comment gerer|comment utiliser|ou trouver|ou est|ou sont|comment activer|comment desactiver/.test(q);
}

function scoreEntry(q: string, entry: Entry) {
  const normalized = norm(q);
  let score = 0;
  for (const alias of entry.aliases) {
    const a = norm(alias);
    if (!a) continue;
    if (normalized === a) score = Math.max(score, 100);
    else if (normalized.includes(a)) score = Math.max(score, 72 + Math.min(18, a.length / 2));
  }

  const qTokens = new Set(tokens(normalized));
  const eTokens = new Set(tokens([...entry.aliases, ...(entry.keywords || [])].join(" ")));
  let overlap = 0;
  for (const token of qTokens) if (eTokens.has(token)) overlap += 1;
  if (overlap) score += overlap * 11;
  if (entry.keywords?.some((keyword) => normalized.includes(norm(keyword)))) score += 8;
  return score;
}

export function answerAwenaEncyclopedia(
  question: string,
  rememberedTopic?: string | null,
): AwenaEncyclopediaReply | null {
  const q = norm(question);
  if (!q) return null;

  let best: { entry: Entry; score: number } | null = null;
  for (const entry of ENTRIES) {
    const score = scoreEntry(q, entry);
    if (!best || score > best.score) best = { entry, score };
  }

  const remembered = rememberedTopic ? ENTRIES.find((entry) => entry.id === rememberedTopic) : null;
  const shortFollow = q.split(" ").length <= 7 && /^(et |alors )?(comment|pourquoi|ou|quand|combien|peut on|est ce que|et si|quelle difference|ca sert)/.test(q);
  if ((!best || best.score < 29) && remembered && shortFollow) best = { entry: remembered, score: 40 };

  if (!best) return null;
  const highConfidence = best.score >= 58;
  const conceptual = looksConceptual(q);
  if (!highConfidence && !conceptual) return null;
  if (best.score < 34) return null;

  return {
    knowledgeTopic: best.entry.id,
    text: best.entry.text,
    actions: actionList(best.entry),
  };
}

export function awenaEncyclopediaTopics() {
  return ENTRIES.map((entry) => ({ id: entry.id, title: entry.title, aliases: [...entry.aliases] }));
}
