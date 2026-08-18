import type { AwenaAction, AwenaReply } from "./awena.types";

export type AwenaGeneralKnowledgeReply = AwenaReply & {
  knowledgeTopic: string;
};

function norm(text: string) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_/\\-]+/g, " ")
    .replace(/[^a-z0-9\s%+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nav(id: string, label: string, route: string): AwenaAction[] {
  return [{ id: `awena-general-${id}`, label, kind: "navigate", route }];
}

function reply(
  knowledgeTopic: string,
  text: string,
  actions?: AwenaAction[],
): AwenaGeneralKnowledgeReply {
  return { knowledgeTopic, text, actions };
}

function definitionQuestion(q: string) {
  return /qu est ce qu(?:e)?|c est quoi|ca veut dire|que veut dire|que signifie|definition|definis|a quoi sert|comment fonctionne/.test(q);
}

function genericFollowUp(q: string) {
  return /^(et )?(alors )?(comment|pourquoi|ou|quand|combien|lequel|laquelle|lesquels|a quoi|ca sert|peut on|est ce que|quelle difference|quelles differences|et pour|et si)\b/.test(q);
}

function mentionsAny(q: string, words: string[]) {
  return words.some((word) => q.includes(norm(word)));
}

function botDefinition() {
  return reply(
    "bot",
    `## DÉFINITION
Un **BOT** est un **joueur virtuel contrôlé par l'application**. Il prend la place d'un participant humain dans les modes qui acceptent les BOTS IA.

## DANS MULTISPORTS SCORING
- Un BOT possède un **nom**, un **avatar**, un **pays** et un **niveau**.
- Le moteur du jeu simule ses décisions ou ses lancers selon le mode et son niveau.
- Tous les jeux n'acceptent pas forcément les bots : chaque mode déclare s'il les prend en charge.
- Les BOTS sont utiles pour jouer **seul contre des adversaires virtuels**, compléter une partie ou s'entraîner.

## NIVEAUX
Les niveaux actuellement prévus sont **Débutant**, **Standard**, **Fort**, **Pro** et **Légende**. Plus le niveau est élevé, plus le bot est censé être régulier et difficile à battre.

## BOT, IA ET AWENA
Dans l'application, **BOT IA** veut surtout dire « joueur virtuel ». Ce n'est pas la même fonction que mon rôle d'assistante. **Awena existe à la fois comme assistante et comme BOT officiel jouable**, mais ces deux rôles restent séparés.

> Pour créer ou gérer les joueurs virtuels, ouvre **Profils > BOTS IA**.`,
    nav("bots", "Ouvrir BOTS IA", "profiles_bots"),
  );
}

function profileDefinition() {
  return reply(
    "profile",
    `## DÉFINITION
Un **profil** représente un joueur humain dans MULTISPORTS SCORING.

## CE QU'IL CENTRALISE
Selon les fonctions utilisées, un profil peut regrouper :
- son **nom** et son **avatar** ;
- son pays et ses informations de présentation ;
- ses préférences de jeu ;
- ses parties et statistiques liées ;
- ses équipements, comme ses **sets de fléchettes** ;
- ses liens avec les fonctions sociales ou en ligne.

## PROFIL LOCAL ET BOT
Un profil local représente une vraie personne. Un **BOT** représente un adversaire virtuel contrôlé par l'application.

> Pour créer, modifier ou sélectionner des joueurs, ouvre **Profils**.`,
    nav("profiles", "Ouvrir Profils", "profiles"),
  );
}

function statsDefinition() {
  return reply(
    "stats",
    `## STATISTIQUES
Les statistiques transforment les parties enregistrées en indicateurs exploitables.

## EXEMPLES
Selon le sport et le mode, l'application peut exploiter notamment :
- **parties jouées**, victoires et **% de victoire** ;
- moyennes, meilleurs scores et records ;
- simples, doubles, triples, Bull, Double Bull et MISS ;
- performances propres à un mode : checkout X01, kills Killer, fermetures Cricket, etc.

## IMPORTANT
Je peux calculer un classement seulement si la donnée existe réellement dans l'historique du mode. Si elle n'est pas enregistrée, je dois te répondre clairement **« cette statistique n'est pas disponible dans les données »** au lieu d'inventer un résultat.

> Ouvre **Stats** pour les tableaux détaillés, ou demande-moi directement un Top 3, un meilleur joueur, un pire joueur ou une période précise.`,
    nav("stats", "Ouvrir Stats", "stats"),
  );
}

function recordsDefinition() {
  return reply(
    "records",
    `## RECORDS
Un **record** correspond à la meilleure — ou parfois à la pire — valeur mesurable dans les parties enregistrées.

## CE QUE TU PEUX ME DEMANDER
- « Qui a le meilleur pourcentage de victoire ? »
- « Top 3 des kills en Killer »
- « Qui a la meilleure moyenne sur 1 mois ? »
- « Qui a reçu le plus de kills ? »
- « Quel est le meilleur checkout ? »
- « Qui est le plus mauvais sur cette statistique ? »

## PÉRIODES
Je peux filtrer les classements sur des périodes comme **7 jours, 1 mois, 3 mois, 6 mois, 1 an** ou l'historique complet, lorsque les dates des parties sont disponibles.

> Si le mode ne sauvegarde pas la métrique demandée, je te le signale explicitement.`,
    nav("records", "Ouvrir les Stats", "stats"),
  );
}

export function answerAwenaGeneralQuestion(
  question: string,
  rememberedTopic?: string | null,
): AwenaGeneralKnowledgeReply | null {
  const q = norm(question);
  const remembered = norm(rememberedTopic || "");

  if (!q) return null;

  // ---------------------------------------------------------------------------
  // BOTS / IA — toujours avant la logique de configuration d'un mode.
  // Cela évite que "Qu'est-ce qu'un bot ?" devienne "X01 accepte les bots".
  // ---------------------------------------------------------------------------
  const botWords = ["bot", "bots", "bot ia", "bots ia", "joueur virtuel", "joueurs virtuels"];
  if (/difference.*(bot|bots).*(joueur|profil|awena|ia)|difference.*(joueur|profil|awena|ia).*(bot|bots)/.test(q)) {
    return reply(
      "bot",
      `## BOT
Un **BOT** est un joueur virtuel piloté par le moteur du jeu.

## PROFIL HUMAIN
Un **profil** représente une vraie personne et sert d'identité pour ses parties, préférences et statistiques.

## IA
Le mot **IA** peut désigner plusieurs choses. Dans « BOTS IA », il désigne surtout la logique qui simule un adversaire. Ce n'est pas automatiquement une IA conversationnelle.

## AWENA
**Awena l'assistante** répond aux questions et guide l'utilisateur. **Awena le BOT officiel** est une version jouable du même personnage dans les modes compatibles.

> Donc : profil = humain, bot = joueur virtuel, Awena = assistante + personnage bot officiel.`,
      nav("bots-difference", "Ouvrir BOTS IA", "profiles_bots"),
    );
  }

  if (mentionsAny(q, botWords) && definitionQuestion(q)) {
    return botDefinition();
  }

  if (mentionsAny(q, botWords) && /creer|ajouter|modifier|editer|supprimer|gerer|personnaliser/.test(q)) {
    return reply(
      "bot",
      `## CRÉER OU GÉRER UN BOT
Ouvre **Profils > BOTS IA**.

## CRÉATION
La page BOTS permet de créer un joueur virtuel avec notamment :
- un **nom** ;
- un **avatar** ;
- un **pays** ;
- un **niveau de difficulté**.

## NIVEAUX DISPONIBLES
- **Débutant** : très accessible, adapté à la découverte.
- **Standard** : proche d'un joueur loisir régulier.
- **Fort** : niveau soutenu, capable de bonnes séries.
- **Pro** : proche d'un bon joueur de club.
- **Légende** : niveau élite, très difficile.

Les bots officiels protégés peuvent être verrouillés afin de conserver leur identité.`,
      nav("bots-create", "Ouvrir BOTS IA", "profiles_bots"),
    );
  }

  if (mentionsAny(q, botWords) && /niveau|difficulte|facile|standard|fort|pro|legende/.test(q)) {
    return reply(
      "bot",
      `## DIFFICULTÉ DES BOTS
MULTISPORTS SCORING prévoit cinq niveaux principaux :
- **Débutant** : très accessible.
- **Standard** : joueur loisir régulier.
- **Fort** : adversaire soutenu.
- **Pro** : niveau très solide.
- **Légende** : niveau élite.

## À RETENIR
Le niveau agit sur le comportement simulé du joueur virtuel. Le détail exact peut varier selon le moteur du mode : un X01 n'utilise pas forcément les mêmes décisions qu'un Killer ou qu'un autre jeu.`,
      nav("bots-level", "Gérer les BOTS IA", "profiles_bots"),
    );
  }

  if (/awena.*bot|bot.*awena/.test(q)) {
    return reply(
      "bot",
      `## AWENA A DEUX RÔLES
**Awena l'assistante** explique l'application, les règles, les configurations, les records et peut t'accompagner pendant une partie.

**Awena le BOT officiel** est un joueur virtuel sélectionnable dans les modes compatibles.

Les deux utilisent le même personnage, mais ce ne sont pas la même fonction : me parler dans le panneau d'aide ne signifie pas que le BOT Awena joue automatiquement dans ta partie.`,
    );
  }

  // Follow-up conversationnel sur les bots.
  if (remembered === "bot" && genericFollowUp(q)) {
    if (/creer|cree|ajouter|faire un|personnaliser|modifier/.test(q)) {
      return reply(
        "bot",
        `## POUR LE CRÉER
Va dans **Profils > BOTS IA**, ouvre l'onglet **Créer**, choisis son identité et son niveau, puis enregistre-le. Il apparaîtra ensuite dans les sélecteurs des modes compatibles.`,
        nav("bots-follow-create", "Ouvrir BOTS IA", "profiles_bots"),
      );
    }
    return botDefinition();
  }

  // ---------------------------------------------------------------------------
  // PROFILS / IDENTITÉ / AVATARS / ÉQUIPES / ÉQUIPEMENT
  // ---------------------------------------------------------------------------
  if (mentionsAny(q, ["profil", "profils"]) && definitionQuestion(q)) return profileDefinition();

  if (/profil actif|profil principal|quel profil est actif|a quoi sert le profil actif/.test(q)) {
    return reply(
      "profile",
      `## PROFIL ACTIF
Le **profil actif** est l'identité de référence utilisée par l'application pour personnaliser l'expérience.

Il sert notamment à rattacher certaines préférences, à mettre le joueur concerné en avant dans les sélecteurs et à présenter ses statistiques personnelles lorsqu'elles sont disponibles.

> Changer de profil actif ne transforme pas les autres profils en bots : ce sont toujours des joueurs locaux distincts.`,
      nav("active-profile", "Ouvrir Profils", "profiles"),
    );
  }

  if (/creer.*profil|ajouter.*joueur|nouveau profil|modifier.*profil|supprimer.*profil/.test(q)) {
    return reply(
      "profile",
      `## GÉRER LES JOUEURS
Ouvre **Profils** pour créer ou modifier les joueurs locaux.

Un profil peut recevoir une identité visuelle, des préférences et des données de jeu. Les statistiques sont ensuite rattachées aux identifiants utilisés dans les parties enregistrées.`,
      nav("profile-create", "Ouvrir Profils", "profiles"),
    );
  }

  if (mentionsAny(q, ["avatar", "photo de profil"]) && definitionQuestion(q)) {
    return reply(
      "avatar",
      `## AVATAR
L'avatar est l'image qui représente un profil ou un bot dans l'application.

Il apparaît notamment dans les sélecteurs de joueurs, les cartes de profil, les écrans de jeu et certaines pages de statistiques.

## PERSONNALISATION
L'application dispose de fonctions de choix ou de création d'avatar. Les bots officiels peuvent conserver un avatar verrouillé pour préserver leur identité.`,
      nav("avatar", "Ouvrir Profils", "profiles"),
    );
  }

  if (mentionsAny(q, ["equipe", "equipes", "team"]) && definitionQuestion(q)) {
    return reply(
      "team",
      `## ÉQUIPE
Une **équipe** regroupe plusieurs joueurs sous un même camp lorsque le mode prend en charge le jeu collectif.

## FONCTIONNEMENT
- Certains modes sont individuels et n'acceptent pas les équipes.
- D'autres permettent de composer deux camps ou davantage.
- Le score, les rôles ou la victoire peuvent alors être partagés selon les règles du mode.

Pour savoir si un jeu précis accepte les équipes, demande par exemple : **« Peut-on jouer en équipes à X01 ? »**.`,
      nav("team", "Ouvrir Profils", "profiles"),
    );
  }

  if (mentionsAny(q, ["dartset", "dart set", "set de flechettes", "mes flechettes"]) && (definitionQuestion(q) || /creer|scanner|ajouter|modifier/.test(q))) {
    return reply(
      "dartset",
      `## SET DE FLÉCHETTES
Un **DartSet** représente un jeu de fléchettes utilisé par un joueur.

## INFORMATIONS GÉRÉES
Le panneau « Mes fléchettes » permet notamment d'enregistrer :
- un **nom** ;
- une **marque** ;
- un **poids** ;
- des notes ;
- un visuel prédéfini ou une photo ;
- un statut favori et des options de visibilité selon le profil.

Les statistiques compatibles peuvent ensuite être rapprochées du matériel utilisé.`,
      nav("dartset", "Ouvrir Profils", "profiles"),
    );
  }

  // ---------------------------------------------------------------------------
  // STATS / HISTORIQUE / RECORDS
  // ---------------------------------------------------------------------------
  if (mentionsAny(q, ["statistique", "statistiques", "stats"]) && definitionQuestion(q)) return statsDefinition();
  if (mentionsAny(q, ["record", "records", "classement", "top 3", "top 5"]) && definitionQuestion(q)) return recordsDefinition();

  if (mentionsAny(q, ["historique"]) && definitionQuestion(q)) {
    return reply(
      "history",
      `## HISTORIQUE
L'historique est la liste des parties enregistrées par l'application.

## POURQUOI IL EST IMPORTANT
Il sert de source aux statistiques, aux classements et aux records. Une statistique ne peut être reconstruite que si la partie a sauvegardé les données nécessaires.

## EXEMPLE
Une partie peut conserver son mode, les participants, le résultat, la date et des données détaillées propres au jeu. Awena peut ensuite agréger ces informations pour répondre à certaines questions.`,
      nav("history", "Ouvrir Stats", "stats"),
    );
  }

  if (/pourcentage de victoire|taux de victoire|win ?%|winrate|win rate/.test(q) && definitionQuestion(q)) {
    return reply(
      "stats",
      `## % DE VICTOIRE
Le **pourcentage de victoire** mesure la part des parties gagnées parmi les parties prises en compte.

**Formule :** victoires ÷ parties jouées × 100.

## EXEMPLE
3 victoires sur 4 parties = **75 %**.

Quand tu me demandes ce classement sur « 1 mois », je dois limiter le calcul aux parties datées de cette période.`,
      nav("winrate", "Ouvrir Stats", "stats"),
    );
  }

  if (/avg3|avg3d|moyenne 3|moyenne trois|moyenne aux flechettes/.test(q) && definitionQuestion(q)) {
    return reply(
      "stats",
      `## AVG3 / AVG3D
En X01, l'**AVG3** représente la moyenne ramenée à **3 fléchettes**.

Elle permet de comparer des joueurs même s'ils n'ont pas joué exactement le même nombre de volées.

> Une moyenne affichée par un autre mode peut avoir une définition différente : je dois utiliser la métrique réellement enregistrée par ce mode.`,
      nav("avg3", "Ouvrir Stats", "stats"),
    );
  }

  // ---------------------------------------------------------------------------
  // VOCABULAIRE FLÉCHETTES
  // ---------------------------------------------------------------------------
  if (/checkout|check out/.test(q) && definitionQuestion(q)) {
    return reply(
      "darts-vocabulary",
      `## CHECKOUT
Un **checkout** est une combinaison de fléchettes permettant de terminer un X01 en arrivant exactement à zéro tout en respectant le mode de sortie.

## EXEMPLE
Avec un **Double OUT**, il faut que la dernière fléchette gagnante soit un double. La route proposée dépend donc du score restant et du nombre de fléchettes encore disponibles.`,
    );
  }

  if (/\bbust\b/.test(q) && definitionQuestion(q)) {
    return reply(
      "darts-vocabulary",
      `## BUST
En X01, un **bust** signifie que la volée n'est pas valide.

Cela arrive notamment si tu descends sous zéro, ou si tu arrives dans une situation interdite par le mode de sortie. Dans l'application, le score revient alors au score du début de la volée conformément à la règle du X01 utilisée.`,
    );
  }

  if (/(simple|double|triple).*(flechette|flechettes|darts|cible)|\b(s20|d20|t20)\b/.test(q) && definitionQuestion(q)) {
    return reply(
      "darts-vocabulary",
      `## SIMPLE / DOUBLE / TRIPLE
Sur une cible de fléchettes :
- **Simple** : valeur normale du segment.
- **Double** : valeur × 2.
- **Triple** : valeur × 3.

## NOTATION
**S20** = simple 20, **D20** = double 20, **T20** = triple 20.

Le triple 20 vaut donc **60 points**.`,
    );
  }

  if (/bull|double bull|dbull/.test(q) && definitionQuestion(q)) {
    return reply(
      "darts-vocabulary",
      `## BULL
Le centre de la cible est séparé en deux zones :
- **Bull** : 25 points.
- **Double Bull / DBULL** : 50 points.

Certains modes utilisent aussi le Bull comme cible spéciale, joker, action ou condition particulière.`,
    );
  }

  if (/\b180\b/.test(q) && definitionQuestion(q)) {
    return reply(
      "darts-vocabulary",
      `## 180
Un **180** est le score maximal d'une volée standard de trois fléchettes : **T20 + T20 + T20 = 180**.

L'application peut le compter comme événement ou record dans les modes qui enregistrent cette statistique.`,
    );
  }

  if (mentionsAny(q, ["volee", "visite", "visit"]) && definitionQuestion(q)) {
    return reply(
      "darts-vocabulary",
      `## VOLÉE / VISITE
Une **volée** — ou **visite** — correspond généralement au passage d'un joueur devant la cible, avec jusqu'à **3 fléchettes** dans les modes standards.

Certains jeux utilisent une quantité différente ou interrompent la volée dès qu'une condition est remplie.`,
    );
  }

  if (mentionsAny(q, ["leg", "set"]) && definitionQuestion(q)) {
    return reply(
      "darts-vocabulary",
      `## LEG ET SET
Un **leg** est une manche élémentaire.

Un **set** regroupe plusieurs legs lorsque le format de la partie utilise des sets.

## EXEMPLE
Dans un X01 configuré en plusieurs legs et sets, il faut d'abord gagner suffisamment de legs pour remporter un set, puis suffisamment de sets pour gagner le match.`,
    );
  }

  if (/double in|simple in|master in|double out|simple out|master out/.test(q) && (definitionQuestion(q) || /difference/.test(q))) {
    return reply(
      "darts-vocabulary",
      `## MODES D'ENTRÉE X01
- **Simple IN** : le scoring peut commencer sans contrainte spéciale.
- **Double IN** : il faut ouvrir le score avec un double.
- **Master IN** : le mode impose une ouverture compatible avec la règle Master du X01.

## MODES DE SORTIE
- **Simple OUT** : n'importe quelle touche valide peut terminer à zéro.
- **Double OUT** : la dernière fléchette doit être un double.
- **Master OUT** : dans le moteur X01 actuel, la dernière fléchette doit être un **double ou un triple**.`,
    );
  }

  // ---------------------------------------------------------------------------
  // SAISIE / MATÉRIEL / JEU
  // ---------------------------------------------------------------------------
  if (/keypad|pave numerique|clavier de score/.test(q) && definitionQuestion(q)) {
    return reply(
      "input",
      `## KEYPAD
Le **keypad** est le pavé de saisie permettant d'enregistrer manuellement une touche ou un score pendant une partie.

Dans les écrans qui le proposent, tu peux choisir la valeur et son multiplicateur, puis valider la saisie.`,
    );
  }

  if (/cible interactive|dartboard clickable|cliquer sur la cible/.test(q) && (definitionQuestion(q) || /comment/.test(q))) {
    return reply(
      "input",
      `## CIBLE INTERACTIVE
La cible interactive permet d'enregistrer une fléchette en touchant directement la zone correspondante à l'écran.

Elle constitue une alternative au keypad lorsque le mode la propose.`,
    );
  }

  if (/camera.*score|scoring camera|camera scoring|camera assistee|reconnaissance camera/.test(q)) {
    return reply(
      "camera",
      `## SCORING CAMÉRA
L'application contient des écrans dédiés à la **configuration** et à la **calibration** du scoring assisté par caméra.

## PRINCIPE
La caméra doit d'abord être calibrée pour que l'application puisse faire correspondre l'image de la cible avec ses zones de score.

> La disponibilité et la précision dépendent du matériel, de la calibration et du mode utilisé.`,
    );
  }

  if (/training|entrainement|s entrainer/.test(q) && definitionQuestion(q)) {
    return reply(
      "training",
      `## TRAINING
Les modes **Training** sont destinés à l'entraînement plutôt qu'à un match classique.

Ils peuvent suivre la précision, les segments touchés, les séries et la progression selon l'exercice. Le catalogue Fléchettes possède notamment un hub Training et des pages de statistiques dédiées.`,
      nav("training", "Ouvrir Jeux", "games"),
    );
  }

  // ---------------------------------------------------------------------------
  // NAVIGATION ET FONCTIONS GÉNÉRALES
  // ---------------------------------------------------------------------------
  if (/competition|tournoi|tournois/.test(q) && definitionQuestion(q)) {
    return reply(
      "competition",
      `## COMPÉTITIONS
Le menu **Compétitions** sert à organiser et suivre des tournois ou rencontres structurées.

L'application possède des écrans pour créer un tournoi, composer les équipes, consulter le tableau, jouer les matchs et enregistrer les résultats.`,
      nav("competition", "Ouvrir Compétitions", "tournaments"),
    );
  }

  if (mentionsAny(q, ["online", "en ligne"]) && definitionQuestion(q)) {
    return reply(
      "online",
      `## ONLINE
Les fonctions **Online** regroupent les interactions réseau disponibles dans l'application : amis, présences, salons ou rencontres compatibles selon les modules activés.

Une partie locale, elle, fonctionne entre joueurs présents sur le même appareil.`,
      nav("online", "Ouvrir Online", "online"),
    );
  }

  if (mentionsAny(q, ["ami", "amis", "demande d ami"]) && (definitionQuestion(q) || /ajouter|inviter|trouver/.test(q))) {
    return reply(
      "online",
      `## AMIS
L'application dispose d'écrans pour les amis et les demandes d'amis.

Ils servent à gérer les relations sociales utilisées par les fonctions en ligne disponibles.`,
      nav("friends", "Ouvrir Online", "online"),
    );
  }

  if (mentionsAny(q, ["club", "clubs"]) && definitionQuestion(q)) {
    return reply(
      "online",
      `## CLUBS
Les clubs font partie de l'espace Online lorsqu'ils sont disponibles. Ils permettent de regrouper des utilisateurs autour d'une structure commune et de fonctions sociales ou compétitives associées.`,
      nav("clubs", "Ouvrir Online", "online"),
    );
  }

  if (/cast|diffusion|deuxieme ecran|second ecran|ecran externe|spectateur/.test(q) && (definitionQuestion(q) || /comment/.test(q))) {
    return reply(
      "screens",
      `## ÉCRANS / CAST
Le menu **Écrans** sert à afficher ou diffuser une partie sur un autre écran compatible.

L'application contient des fonctions d'hôte, de viewer et de spectateur. Cela permet de séparer l'écran de contrôle du joueur de l'écran de présentation.`,
      nav("screens", "Ouvrir Écrans", "cast_host"),
    );
  }

  if (/message|messagerie/.test(q) && definitionQuestion(q)) {
    return reply(
      "messages",
      `## MESSAGES
Le centre **Messages** regroupe la messagerie de l'application et les échanges compatibles avec les fonctions sociales.`,
      nav("messages", "Ouvrir Messages", "messages"),
    );
  }

  if (/sauvegarde|backup|restauration|restaurer|coffre|storage vault/.test(q) && (definitionQuestion(q) || /comment|ou/.test(q))) {
    return reply(
      "backup",
      `## SAUVEGARDE
Le **coffre de stockage** sert à protéger les données importantes de MULTISPORTS SCORING.

## DONNÉES CONCERNÉES
Le système de sauvegarde sait inventorier notamment :
- parties et statistiques ;
- profils ;
- images ;
- équipes ;
- bots ;
- sets de fléchettes.

Selon la configuration de l'application, différents emplacements de sauvegarde peuvent être proposés.

> Une restauration doit être utilisée avec attention car elle peut remplacer des données locales par celles du snapshot choisi.`,
      nav("backup", "Ouvrir le coffre", "storage_vault"),
    );
  }

  if (/synchronisation|synchroniser|sync/.test(q) && definitionQuestion(q)) {
    return reply(
      "backup",
      `## SYNCHRONISATION
La synchronisation sert à rapprocher les données présentes sur l'appareil avec une source de sauvegarde ou un service connecté lorsqu'il est configuré.

Elle est différente d'un simple affichage : elle peut copier, restaurer ou mettre à jour des données. Il faut donc vérifier la source et la date avant une restauration.`,
      nav("sync", "Ouvrir le coffre", "storage_vault"),
    );
  }

  if (/hors ligne|offline|sans internet|sans connexion/.test(q)) {
    return reply(
      "offline",
      `## UTILISATION HORS LIGNE
Une grande partie des fonctions locales — profils, jeux locaux, historique local et ma voix neuronale une fois son pack installé — peut fonctionner directement sur l'appareil.

Les fonctions **Online**, certains téléchargements, la publicité et les services de sauvegarde distants peuvent en revanche nécessiter une connexion.`,
    );
  }

  if (/theme|apparence|couleur|mode sombre|dark mode/.test(q) && (definitionQuestion(q) || /changer|modifier|ou/.test(q))) {
    return reply(
      "settings",
      `## THÈME ET APPARENCE
Les préférences visuelles se règlent dans **Réglages**. Elles permettent d'adapter l'apparence de l'application sans changer les règles des jeux.`,
      nav("theme", "Ouvrir Réglages", "settings"),
    );
  }

  if (/langue|francais|anglais|espagnol|traduction/.test(q) && /changer|modifier|choisir|ou|quelle/.test(q)) {
    return reply(
      "settings",
      `## LANGUE
La langue de l'interface se choisit dans **Réglages > Langues**.

## AWENA
Awena suit désormais cette langue sur Android :
- ta question est ramenée vers sa base de connaissances canonique ;
- la réponse est traduite localement vers la langue choisie ;
- le français conserve la voix neuronale Awena ;
- les autres langues utilisent une voix Android adaptée à leur prononciation.

> Le premier usage d'une nouvelle langue peut demander le téléchargement local de son modèle de traduction.`,
      nav("language", "Ouvrir Réglages", "settings"),
    );
  }

  if (/son|audio|musique|volume|effet sonore/.test(q) && /changer|couper|regler|modifier|ou/.test(q)) {
    return reply(
      "settings",
      `## AUDIO
Les réglages audio permettent de gérer les sons, volumes et options vocales disponibles.

Ma voix Awena possède ses propres paramètres et peut être arrêtée directement avec l'icône **muet** pendant une réponse.`,
      nav("audio", "Ouvrir Réglages", "settings"),
    );
  }

  if (/discrete|active|coach|presence d awena|mode awena/.test(q) && (definitionQuestion(q) || /difference/.test(q))) {
    return reply(
      "awena",
      `## PRÉSENCE D'AWENA
- **Désactivée** : Awena reste silencieuse et masquée.
- **Discrète** : accessible manuellement, sans interventions spontanées.
- **Active** : assistante disponible avec les réactions importantes.
- **Coach** : accompagnement et conseils plus fréquents pendant les parties.

Ces modes règlent ma présence ; ils ne changent pas les règles du jeu.`,
      nav("awena-settings", "Ouvrir Réglages", "settings"),
    );
  }

  if (/pub|publicite|annonce test|admob/.test(q) && definitionQuestion(q)) {
    return reply(
      "ads",
      `## PUBLICITÉ
L'application peut afficher des emplacements publicitaires configurés. Sur Android, certaines bannières sont des vues natives distinctes de la WebView.

Quand mon panneau de dialogue est ouvert, les bannières inline doivent être masquées afin de ne pas recouvrir la conversation.`,
    );
  }

  // ---------------------------------------------------------------------------
  // MÉTA : règles / configuration / records / capacités d'Awena
  // ---------------------------------------------------------------------------
  if (/difference.*regle.*configuration|difference.*configuration.*regle/.test(q)) {
    return reply(
      "help",
      `## RÈGLES
Les règles expliquent **ce qu'il faut faire pour jouer et gagner**.

## CONFIGURATION
La configuration décrit **les options que tu peux régler avant la partie** : joueurs, équipes, bots, variantes, valeurs, formats, conditions ou aides disponibles.

## RECORDS
Les records utilisent **les données des parties déjà enregistrées** pour produire des meilleurs scores, classements, moyennes ou comparaisons.`,
    );
  }

  if (/que peux tu faire|quelles questions|que puis je te demander|tu sais faire quoi|aide moi/.test(q)) {
    return reply(
      "help",
      `## CE QUE TU PEUX ME DEMANDER
Je peux répondre sur plusieurs niveaux.

## APPLICATION
- Où se trouve un écran ou une fonction ?
- Comment créer un profil, un bot ou gérer les statistiques ?
- À quoi servent les menus, options et outils ?

## JEUX
- Règles d'un mode.
- Configuration détaillée.
- Variantes et conditions de victoire.
- Comment lancer le mode dans l'application.

## STATISTIQUES
- Meilleur ou pire joueur.
- Top 3 / Top 5.
- Pourcentage de victoire.
- Statistiques spécifiques enregistrées par le mode.
- Périodes comme « depuis 1 mois ».

## VOCABULAIRE
Tu peux aussi me demander **« C'est quoi un bot ? »**, **« Qu'est-ce qu'un checkout ? »**, **« C'est quoi un bust ? »**, **« Que signifie AVG3 ? »**, etc.

> Si une information n'existe pas dans ma base ou dans tes données, je dois te le dire clairement au lieu de l'inventer.`,
    );
  }

  if (/pourquoi tu ne sais pas|pourquoi tu ne reponds pas|tu ne sais pas|tu connais tout/.test(q)) {
    return reply(
      "help",
      `## MES LIMITES
Je fonctionne avec une **base de connaissances locale de MULTISPORTS SCORING**, le contexte de l'écran ouvert et les données que l'application a réellement enregistrées.

Je ne dois pas inventer :
- une règle absente du mode ;
- une option qui n'existe pas ;
- une statistique qui n'a jamais été sauvegardée.

Si je ne possède pas une donnée, la bonne réponse est de te dire précisément ce qui me manque.`,
    );
  }

  // Reprise légère du sujet général pour les suivis très courts.
  if (remembered === "profile" && genericFollowUp(q)) return profileDefinition();
  if (remembered === "stats" && genericFollowUp(q)) return statsDefinition();
  if (remembered === "records" && genericFollowUp(q)) return recordsDefinition();

  return null;
}
