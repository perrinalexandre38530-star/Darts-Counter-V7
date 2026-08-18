import type { AwenaAction, AwenaReply, AwenaRuntimeContext } from "./awena.types";

type Entry = {
  id: string;
  title: string;
  aliases: string[];
  text: string;
  route?: string;
};

const STOP = new Set([
  "a", "ai", "au", "aux", "avec", "ce", "ces", "cette", "cest", "ca",
  "de", "des", "du", "dans", "et", "est", "il", "elle", "en", "je",
  "la", "le", "les", "ma", "mais", "me", "mes", "mon", "ne", "nous",
  "on", "ou", "pour", "que", "quel", "quelle", "quels", "quelles", "qui",
  "quoi", "se", "son", "sur", "ta", "te", "tes", "ton", "tu", "un",
  "une", "vos", "votre", "y", "comment", "pourquoi", "faire", "sert",
  "signifie", "veut", "dire", "fonctionne", "explique", "expliquer", "moi",
  "application", "appli",
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
  return norm(value)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP.has(token));
}

function md(...lines: string[]) {
  return lines.join("\n");
}

function nav(id: string, label: string, route: string): AwenaAction {
  return { id: `awena-advanced-${id}`, label, kind: "navigate", route };
}

// -----------------------------------------------------------------------------
// Métriques X01 : définitions et méthodes de calcul
// -----------------------------------------------------------------------------
const X01_METRICS: Entry[] = [
  {
    id: "x01-avg3",
    title: "AVG3D / moyenne 3 fléchettes",
    aliases: [
      "avg3",
      "avg3d",
      "moyenne 3 flechettes",
      "moyenne trois flechettes",
    ],
    text: md(
      "## AVG3D",
      "L'**AVG3D** est la moyenne ramenée à **3 fléchettes**. Pour être précise, Awena privilégie le calcul pondéré `points scorés ÷ fléchettes lancées × 3` lorsque ces deux valeurs existent dans l'Historique. Une simple moyenne des moyennes de matchs peut être moins exacte si les matchs n'ont pas la même durée.",
      "",
      "> Pour un record, je dois utiliser les parties X01 enregistrées dans Historique, pas un compteur rapide isolé.",
    ),
  },
  {
    id: "x01-avg1",
    title: "AVG 1 dart",
    aliases: [
      "avg 1 dart",
      "avg1",
      "moyenne 1 flechette",
      "moyenne une flechette",
    ],
    text: md(
      "## AVG 1 DART",
      "L'**AVG 1 dart** est la moyenne par fléchette. Dans le comparateur X01 de l'application, elle correspond à **AVG3D ÷ 3**. Elle permet de comparer la régularité indépendamment du format d'affichage traditionnel à trois fléchettes.",
    ),
  },
  {
    id: "x01-best-visit",
    title: "Best Visit",
    aliases: [
      "best visit",
      "meilleure volee",
      "meilleure visite",
      "meilleur score en une volee",
    ],
    text: md(
      "## BEST VISIT",
      "La **Best Visit** est la meilleure volée enregistrée sur une partie ou une période. En X01, une volée contient normalement jusqu'à trois fléchettes. Un 180 est donc une Best Visit de 180, mais une Best Visit peut être inférieure à 180.",
    ),
  },
  {
    id: "x01-best-checkout",
    title: "Best Checkout",
    aliases: [
      "best checkout",
      "meilleur checkout",
      "meilleure sortie",
      "plus grosse sortie",
    ],
    text: md(
      "## BEST CHECKOUT",
      "Le **Best Checkout** est la plus grosse valeur réellement terminée en checkout. Il faut distinguer une grosse volée d'une vraie sortie : le checkout doit faire atteindre exactement zéro selon la règle OUT configurée.",
    ),
  },
  {
    id: "x01-checkout-rate",
    title: "CO % / réussite checkout",
    aliases: [
      "co %",
      "checkout %",
      "taux de checkout",
      "reussite checkout",
      "checkout rate",
    ],
    text: md(
      "## CO %",
      "Le **taux de checkout** mesure la réussite sur les tentatives de sortie : `checkouts réussis ÷ tentatives de checkout × 100`. Si les tentatives ne sont pas enregistrées dans une ancienne partie, ce pourcentage ne peut pas être reconstruit de façon fiable.",
    ),
  },
  {
    id: "x01-checkout-attempts",
    title: "Tentatives de checkout",
    aliases: [
      "tentatives checkout",
      "co tentes",
      "co tentés",
      "checkout attempts",
    ],
    text: md(
      "## TENTATIVES DE CHECKOUT",
      "Une **tentative de checkout** compte lorsqu'une fléchette est réellement jouée pour terminer la partie selon la règle de sortie. Ce nombre sert de dénominateur au taux de réussite checkout.",
    ),
  },
  {
    id: "x01-checkout-success",
    title: "Checkouts réussis",
    aliases: [
      "co reussis",
      "checkout hits",
      "checkouts reussis",
      "sorties reussies",
    ],
    text: md(
      "## CHECKOUTS RÉUSSIS",
      "Ce compteur indique combien de tentatives de sortie ont effectivement terminé un leg. Il peut être additionné sur l'Historique et comparé au nombre de tentatives pour obtenir le CO %.",
    ),
  },
  {
    id: "x01-60plus",
    title: "60+",
    aliases: [
      "60+",
      "60 plus",
    ],
    text: md(
      "## 60+",
      "Dans les historiques X01 actuels, les buckets de volées sont enregistrés en classes exclusives. **60+** correspond aux volées de **60 à 99** lorsque cette logique est utilisée. Les catégories 100+, 140+ et 180 sont comptées séparément.",
    ),
  },
  {
    id: "x01-100plus",
    title: "100+",
    aliases: [
      "100+",
      "100 plus",
    ],
    text: md(
      "## 100+",
      "Le bucket **100+** correspond aux volées de **100 à 139** dans le format actuel de l'Historique X01. Une volée à 140 n'est donc pas comptée ici : elle entre dans 140+.",
    ),
  },
  {
    id: "x01-140plus",
    title: "140+",
    aliases: [
      "140+",
      "140 plus",
    ],
    text: md(
      "## 140+",
      "Le bucket **140+** correspond aux volées de **140 à 179**. Le 180 possède son propre compteur, ce qui évite de compter la même volée dans plusieurs catégories.",
    ),
  },
  {
    id: "x01-180",
    title: "180",
    aliases: [
      "180",
      "maximum x01",
    ],
    text: md(
      "## 180",
      "Un **180** est la volée maximale classique : trois triples 20. L'Historique X01 possède un compteur dédié ; Awena peut donc classer les joueurs par nombre de 180 si cette donnée est présente dans les parties enregistrées.",
    ),
  },
  {
    id: "x01-hit-rate",
    title: "Hits %",
    aliases: [
      "hits %",
      "taux de touches",
      "precision x01",
      "hit rate",
    ],
    text: md(
      "## HITS %",
      "Le **Hits %** compare les touches comptabilisées au nombre total de fléchettes. Sa définition dépend de la granularité réellement enregistrée : une partie saisie uniquement par score de volée peut ne pas contenir assez de détail pour reconstruire simples, doubles et triples.",
    ),
  },
  {
    id: "x01-single",
    title: "Simples",
    aliases: [
      "simples x01",
      "single hits",
      "simple %",
    ],
    text: md(
      "## SIMPLES",
      "Le compteur **Simple** correspond aux impacts enregistrés dans un segment simple. Il est disponible uniquement lorsque la partie conserve le détail des impacts, pas seulement le score total de la volée.",
    ),
  },
  {
    id: "x01-double",
    title: "Doubles",
    aliases: [
      "doubles x01",
      "double hits",
      "double %",
    ],
    text: md(
      "## DOUBLES",
      "Le compteur **Double** mesure les impacts dans l'anneau double. À ne pas confondre avec **Double OUT**, qui est une règle de finition : on peut toucher des doubles dans une partie qui n'est pas en Double OUT.",
    ),
  },
  {
    id: "x01-triple",
    title: "Triples",
    aliases: [
      "triples x01",
      "triple hits",
      "triple %",
    ],
    text: md(
      "## TRIPLES",
      "Le compteur **Triple** mesure les impacts dans l'anneau triple. Les triples servent au scoring mais n'indiquent pas à eux seuls la qualité globale : AVG3, Best Visit et checkout complètent l'analyse.",
    ),
  },
  {
    id: "x01-bull25",
    title: "Bull 25",
    aliases: [
      "bull 25",
      "bull simple",
      "single bull",
    ],
    text: md(
      "## BULL 25",
      "Le **Bull** simple vaut 25 points. Dans les statistiques détaillées, il est séparé du Double Bull à 50 afin de pouvoir compter et comparer les deux types d'impact.",
    ),
  },
  {
    id: "x01-dbull50",
    title: "Double Bull 50",
    aliases: [
      "dbull 50",
      "double bull 50",
      "bull 50",
      "dbull",
    ],
    text: md(
      "## DOUBLE BULL 50",
      "Le **Double Bull** vaut 50 points et possède son propre compteur. Selon la règle OUT, il peut aussi servir de double de finition.",
    ),
  },
  {
    id: "x01-miss",
    title: "MISS",
    aliases: [
      "miss x01",
      "rates x01",
      "ratés x01",
      "miss %",
    ],
    text: md(
      "## MISS",
      "Un **MISS** représente une fléchette enregistrée comme ratée / sans score exploitable. Le MISS % rapporte ce compteur au nombre total de fléchettes lorsque le détail est disponible.",
    ),
  },
  {
    id: "x01-bust",
    title: "Bust",
    aliases: [
      "bust x01",
      "bust %",
      "busts",
    ],
    text: md(
      "## BUST",
      "Un **bust** se produit lorsqu'une volée rend la finition invalide — par exemple score négatif ou sortie incompatible avec la règle OUT. Dans ce cas, le score de la volée est annulé selon les règles X01. Le compteur Bust mesure ces incidents enregistrés.",
    ),
  },
  {
    id: "x01-leg-ratio",
    title: "Ratio legs W %",
    aliases: [
      "ratio legs",
      "legs w %",
      "taux de legs gagnes",
    ],
    text: md(
      "## RATIO LEGS W %",
      "Le ratio de legs gagnés est `legs gagnés ÷ legs joués × 100`. Il ne doit pas être confondu avec le Win % des matchs : un joueur peut perdre un match tout en ayant gagné plusieurs legs.",
    ),
  },
  {
    id: "x01-best9",
    title: "Best 9 darts",
    aliases: [
      "best 9 darts",
      "best 9",
      "meilleurs 9 darts",
    ],
    text: md(
      "## BEST 9 DARTS",
      "Le **Best 9 darts** mesure la meilleure séquence de neuf fléchettes lorsqu'elle est reconstruite par le moteur de statistiques. Si l'Historique ne contient que des résumés sans détail de volées, cette statistique peut être impossible à recalculer.",
    ),
  },
  {
    id: "x01-input-detail",
    title: "Granularité des stats X01",
    aliases: [
      "stats clavier x01",
      "stats cible x01",
      "details stats x01",
      "granularite x01",
    ],
    text: md(
      "## GRANULARITÉ DES STATS X01",
      "La précision des statistiques dépend de la méthode de saisie enregistrée. Une **cible interactive / saisie impact par impact** peut fournir S/D/T, Bull, MISS et secteurs. Une saisie par **score de volée** conserve surtout score, fléchettes, moyenne et résultats ; certains détails de segments ne peuvent alors pas être inventés.",
    ),
  },
];

// -----------------------------------------------------------------------------
// Statistiques : principes généraux et source Historique
// -----------------------------------------------------------------------------
const GENERAL: Entry[] = [
  {
    id: "history-source-truth",
    title: "Historique = source des statistiques",
    aliases: [
      "source des stats",
      "historique source stats",
      "d ou viennent les stats",
      "base des records",
    ],
    route: "stats",
    text: md(
      "## SOURCE DE VÉRITÉ DES STATS",
      "Pour Awena, la référence doit être **l'ensemble des parties enregistrées dans Historique**. Le cache rapide de l'interface ne sert qu'à accélérer l'affichage : il ne doit jamais conclure qu'une partie n'existe pas.",
      "",
      "## CONSÉQUENCE",
      "Pour un record ou un classement, je parcours les parties du mode, applique la période demandée, identifie les joueurs puis agrège uniquement les métriques réellement sauvegardées.",
    ),
  },
  {
    id: "stats-header-payload",
    title: "Résumé et payload d'une partie",
    aliases: [
      "header historique",
      "payload historique",
      "resume partie stats",
      "données detaillees partie",
    ],
    text: md(
      "## RÉSUMÉ ET DONNÉES DÉTAILLÉES",
      "Une partie peut conserver un **résumé léger** dans l'Historique et un **payload détaillé** séparé. Les records simples — parties, victoires, joueurs — peuvent souvent être calculés depuis le résumé. Pour une statistique ancienne ou très détaillée, Awena peut devoir relire le payload complet de la partie.",
    ),
  },
  {
    id: "stats-all-history",
    title: "Historique complet",
    aliases: [
      "tout l historique",
      "toutes les parties",
      "historique complet stats",
      "records depuis toujours",
    ],
    text: md(
      "## HISTORIQUE COMPLET",
      "Sans période précisée, un record doit couvrir **toutes les parties enregistrées disponibles** du mode concerné. Si tu demandes « depuis 1 mois », seules les parties datées dans cette fenêtre doivent participer au calcul.",
    ),
  },
  {
    id: "stats-periods",
    title: "Filtres temporels",
    aliases: [
      "stats 7 jours",
      "stats 1 mois",
      "stats 3 mois",
      "stats 6 mois",
      "stats 1 an",
    ],
    text: md(
      "## FILTRES DE PÉRIODE",
      "Awena comprend notamment : dernières 24 h, 7 jours, 30 jours / 1 mois, 3 mois, 6 mois, 12 mois et historique complet. Une partie sans date fiable ne peut pas être placée correctement dans une période courte.",
    ),
  },
  {
    id: "stats-unavailable",
    title: "Statistique non enregistrée",
    aliases: [
      "statistique non disponible",
      "stat inexistante",
      "pourquoi awena ne trouve pas stat",
      "donnee absente stats",
    ],
    text: md(
      "## SI UNE STATISTIQUE N'EXISTE PAS",
      "Je dois distinguer **« aucune partie trouvée »** de **« parties trouvées mais métrique absente »**. Dans le second cas, je dois dire combien de parties j'ai vérifiées et préciser que la donnée n'est pas enregistrée, plutôt que d'inventer un zéro ou une réponse approximative.",
    ),
  },
  {
    id: "stats-player-identity",
    title: "Identité joueur dans l'Historique",
    aliases: [
      "stats mauvais joueur",
      "identifiant joueur stats",
      "profil stats historique",
      "nom joueur stats",
    ],
    text: md(
      "## IDENTITÉ JOUEUR",
      "Les statistiques doivent privilégier les **identifiants de profil / joueur** enregistrés, puis utiliser le nom comme compatibilité. Deux joueurs portant le même nom ne doivent pas être fusionnés automatiquement ; inversement, un même profil peut avoir besoin d'une normalisation entre anciennes et nouvelles sauvegardes.",
    ),
  },
  {
    id: "stats-team-individual",
    title: "Résultat équipe vs performance individuelle",
    aliases: [
      "stats equipe",
      "stats individuelles equipe",
      "victoire equipe stats joueur",
    ],
    text: md(
      "## ÉQUIPE ET INDIVIDUEL",
      "Dans un match par équipes, la **victoire** peut appartenir au camp tandis que les impacts, moyennes ou actions restent attribués aux joueurs. Un record individuel et un classement d'équipe répondent donc à deux questions différentes.",
    ),
  },
  {
    id: "stats-bots",
    title: "BOTS dans les statistiques",
    aliases: [
      "stats bots",
      "records bots",
      "bot dans historique",
    ],
    text: md(
      "## BOTS ET STATS",
      "Un BOT peut apparaître dans l'Historique comme participant si le mode l'enregistre. Awena peut le classer comme un joueur lorsque son identité et ses métriques sont présentes. Il faut cependant conserver son statut BOT pour ne pas le confondre avec un profil humain.",
    ),
  },
  {
    id: "stats-cache",
    title: "Cache de statistiques",
    aliases: [
      "cache stats",
      "stats rapides",
      "quick stats",
      "pourquoi stats differentes cache",
    ],
    text: md(
      "## CACHE RAPIDE",
      "Les caches servent à rendre les écrans fluides. Ils ne sont **pas** la source de vérité d'un record. Si un cache est vide au démarrage mais que l'Historique contient des parties, Awena doit lire l'Historique avant de conclure qu'il n'y a aucune donnée.",
    ),
  },
  {
    id: "stats-history-empty",
    title: "Historique vide",
    aliases: [
      "historique vide",
      "aucune partie historique",
      "stats vides",
    ],
    text: md(
      "## SI L'HISTORIQUE EST VIDE",
      "Sans partie enregistrée, aucun record fiable ne peut être calculé. Vérifie d'abord que les cartes de matchs existent dans **Historique**. Si elles existent mais qu'un écran Stats reste vide, le problème vient alors de l'indexation / normalisation, pas de l'absence de parties.",
    ),
  },
  {
    id: "stats-history-vs-online",
    title: "Local vs Online",
    aliases: [
      "stats local online",
      "historique online",
      "records online local",
    ],
    text: md(
      "## LOCAL ET ONLINE",
      "L'application possède des vues locales et Online. Pour une question de records locaux, Awena doit se baser sur les parties présentes dans l'Historique local. Une statistique Online peut avoir son propre périmètre et ne doit pas être mélangée sans indication.",
    ),
  },
  {
    id: "stats-history-import",
    title: "Stats après import",
    aliases: [
      "stats apres import",
      "stats après restauration",
      "historique importe stats",
    ],
    text: md(
      "## APRÈS IMPORT / RESTAURATION",
      "Une restauration peut réinjecter beaucoup d'anciennes parties. Les caches doivent alors être invalidés et les statistiques recalculées depuis l'Historique restauré. Une valeur précédente du cache ne doit pas écraser les données importées.",
    ),
  },
  {
    id: "stats-dashboard",
    title: "Dashboard",
    aliases: [
      "dashboard stats",
      "vue globale stats",
      "resume stats",
    ],
    route: "stats",
    text: md(
      "## DASHBOARD STATS",
      "Le **Dashboard** est une synthèse : matchs, victoires, taux de victoire et métriques fortes du sport / mode. Il ne remplace pas les pages détaillées : Historique, classements, joueurs, équipes et graphiques apportent des angles différents.",
    ),
  },
  {
    id: "stats-leaderboard",
    title: "Classement / leaderboard",
    aliases: [
      "leaderboard",
      "classement stats",
      "top joueurs",
    ],
    route: "stats_leaderboards",
    text: md(
      "## CLASSEMENT",
      "Un classement ordonne les joueurs selon **une métrique définie** : Win %, victoires, moyenne, kills, etc. Dire « meilleur joueur » sans critère peut être ambigu ; Awena doit soit utiliser le critère explicitement demandé, soit demander / expliquer celui retenu.",
    ),
  },
  {
    id: "stats-record-vs-average",
    title: "Record vs moyenne",
    aliases: [
      "difference record moyenne",
      "record ou moyenne",
      "max vs moyenne",
    ],
    text: md(
      "## RECORD ET MOYENNE",
      "Un **record** est généralement un maximum ou minimum remarquable — meilleur checkout, Best Visit, plus de kills sur un match. Une **moyenne** agrège plusieurs parties. Les deux ne doivent jamais être calculés avec la même opération.",
    ),
  },
  {
    id: "stats-win-rate",
    title: "Win %",
    aliases: [
      "win %",
      "win rate",
      "taux de victoire",
      "pourcentage de victoire",
    ],
    text: md(
      "## WIN %",
      "Le **taux de victoire** est `victoires ÷ parties jouées × 100`. Pour être juste, le nombre de parties doit correspondre au même périmètre que les victoires : même mode, même période et même type de classement.",
    ),
  },
  {
    id: "stats-match-count",
    title: "Parties jouées",
    aliases: [
      "parties jouees stats",
      "nombre de matchs",
      "sessions matchs",
    ],
    text: md(
      "## PARTIES / MATCHS",
      "Le compteur de parties représente le nombre de matchs exploitables pour le joueur dans le périmètre demandé. Une partie en cours ou un autosave stale ne doit pas être compté comme un match terminé si l'Historique la classe encore en progression.",
    ),
  },
  {
    id: "stats-record-provenance",
    title: "Provenance d'un record",
    aliases: [
      "d ou vient ce record",
      "source record",
      "combien de parties record",
    ],
    text: md(
      "## PROVENANCE",
      "Une réponse de records fiable doit pouvoir indiquer son **périmètre** : mode, période et nombre de parties de l'Historique vérifiées. C'est ce qui permet de comprendre pourquoi deux classements peuvent différer.",
    ),
  },
  {
    id: "stats-rebuild",
    title: "Recalcul des statistiques",
    aliases: [
      "recalcul stats",
      "rebuild stats",
      "reconstruire stats",
      "rafraichir stats",
    ],
    text: md(
      "## RECALCUL",
      "Les écrans Stats peuvent reconstruire leurs agrégats depuis l'Historique. C'est utile après une restauration, une correction de normalisation ou l'ajout d'un ancien format de partie. Le recalcul ne doit pas modifier les matchs eux-mêmes : il reconstruit seulement les vues statistiques.",
    ),
  },
  {
    id: "stats-match-detail",
    title: "Détail d'une partie",
    aliases: [
      "detail match stats",
      "stats d une partie",
      "voir stats match",
    ],
    text: md(
      "## DÉTAIL D'UNE PARTIE",
      "Le détail de match affiche les métriques d'une **partie précise**, alors qu'un dashboard agrège plusieurs matchs. Pour vérifier un record suspect, comparer le détail de la partie avec l'agrégat est une bonne méthode de diagnostic.",
    ),
  },
  {
    id: "stats-local-profile",
    title: "Stats profil local",
    aliases: [
      "stats profil local",
      "mes stats profil",
      "stats joueur local",
    ],
    text: md(
      "## STATS D'UN PROFIL",
      "Les statistiques personnelles doivent filtrer l'Historique sur l'identité du profil. Le nom seul est un fallback ; l'identifiant du profil est préférable pour éviter les collisions entre joueurs portant le même nom.",
    ),
  },
  {
    id: "stats-dartset",
    title: "Stats par DartSet",
    aliases: [
      "stats dartset",
      "meilleur jeu de flechettes",
      "performance dartset",
    ],
    text: md(
      "## STATS PAR DARTSET",
      "Une comparaison par DartSet n'est possible que si le set utilisé a été enregistré avec la partie. Les matchs anciens sans `dartSetId` ne peuvent pas être attribués rétroactivement avec certitude à un set précis.",
    ),
  },
  {
    id: "stats-training",
    title: "Stats Training",
    aliases: [
      "stats training",
      "progression entrainement",
      "records training",
    ],
    route: "training",
    text: md(
      "## STATS TRAINING",
      "Les entraînements privilégient la progression : précision, séries, temps, moyenne, réussite d'objectifs ou nombre de fléchettes selon l'exercice. Un Win % n'est pas toujours pertinent pour un mode Training.",
    ),
  },
  {
    id: "stats-cricket",
    title: "Stats Cricket",
    aliases: [
      "stats cricket",
      "records cricket",
      "classement cricket",
    ],
    route: "cricket_stats",
    text: md(
      "## STATS CRICKET",
      "La page Cricket dédiée se base sur les **parties terminées de l'Historique**. Elle peut notamment établir des classements joueurs et un Win %. Les impacts Cricket dépendent des cibles 15–20 et Bull enregistrées dans les parties.",
    ),
  },
  {
    id: "stats-killer",
    title: "Stats Killer",
    aliases: [
      "stats killer",
      "records killer",
      "dashboard killer",
    ],
    text: md(
      "## STATS KILLER",
      "Le module Killer exploite l'Historique et possède des métriques spécifiques : matchs, victoires, kills, kills par match, hits, précision, actions spéciales, auto-kills, tendances et records personnels lorsque ces champs existent.",
      "",
      "> Une question comme « qui a reçu le plus de kills ? » doit chercher les éliminations subies / deaths dans les parties Killer enregistrées.",
    ),
  },
  {
    id: "stats-territories",
    title: "Stats TERRITORIES",
    aliases: [
      "stats territories",
      "stats territoires",
      "records territories",
    ],
    text: md(
      "## STATS TERRITORIES",
      "La page TERRITORIES annonce explicitement une **source unifiée Historique / IndexedDB**. Elle suit notamment les parties exploitables, domination, Bulls / DBulls, bonus Bull rejoués, captures, objectifs, types de victoire et tendances lorsque ces données sont sauvegardées.",
    ),
  },
  {
    id: "stats-firefighter",
    title: "Stats Darts Firefighter",
    aliases: [
      "stats firefighter",
      "records firefighter",
      "stats pompier",
    ],
    text: md(
      "## STATS DARTS FIREFIGHTER",
      "Les statistiques Firefighter peuvent exploiter des mesures de mission enregistrées : précision, feu réduit, territoires éteints / protégés, blocages, eau utilisée, zones critiques, meilleure volée et taux de réussite selon les données présentes dans l'Historique.",
    ),
  },
  {
    id: "stats-petanque",
    title: "Centre Stats Pétanque",
    aliases: [
      "stats petanque",
      "statistiques petanque",
      "classement petanque",
    ],
    route: "stats",
    text: md(
      "## STATS PÉTANQUE",
      "La Pétanque possède des pages dédiées **Joueurs, Équipes, Leaderboards, Matchs et Historique**. Le périmètre doit rester sportif : les parties Pétanque ne doivent pas être mélangées aux matchs Fléchettes.",
    ),
  },
  {
    id: "stats-babyfoot",
    title: "Centre Stats Baby-foot",
    aliases: [
      "stats babyfoot",
      "stats baby foot",
      "historique babyfoot",
    ],
    route: "stats",
    text: md(
      "## STATS BABY-FOOT",
      "Le Baby-foot possède un shell Stats, un **centre de statistiques**, une page **Historique** et des statistiques **Équipes**. Les matchs importés sont normalisés comme `kind: babyfoot` afin de rester identifiables dans l'Historique.",
    ),
  },
  {
    id: "stats-pingpong",
    title: "Centre Stats Ping-Pong",
    aliases: [
      "stats ping pong",
      "stats pingpong",
      "historique ping pong",
    ],
    route: "stats",
    text: md(
      "## STATS PING-PONG",
      "Le Ping-Pong possède son propre shell Stats, une page Historique et un détail de match. Les statistiques doivent donc être calculées à partir des parties Ping-Pong enregistrées, sans utiliser les métriques propres au X01.",
    ),
  },
  {
    id: "stats-molkky",
    title: "Centre Stats Mölkky",
    aliases: [
      "stats molkky",
      "records molkky",
      "classement molkky",
    ],
    route: "stats",
    text: md(
      "## STATS MÖLKKY",
      "Le Mölkky est intégré au centre Stats et possède des pages dédiées Historique, Leaderboards, Joueurs et Locaux. Les métriques pertinentes sont celles sauvegardées par les parties Mölkky ; une notion comme checkout X01 n'y a pas de sens.",
    ),
  },
  {
    id: "stats-dice",
    title: "Centre Stats Dés",
    aliases: [
      "stats des",
      "stats dés",
      "records dice",
      "statistiques dice",
    ],
    route: "stats",
    text: md(
      "## STATS DÉS",
      "Les jeux de Dés possèdent des pages statistiques dédiées dans l'application. Le bon agrégat dépend du mode de dés concerné : score, victoires, manches ou autres valeurs sauvegardées dans l'Historique.",
    ),
  },
];

// -----------------------------------------------------------------------------
// Précisions avancées : filtres, identité, qualité des données et X01
// -----------------------------------------------------------------------------
const PRECISION: Entry[] = [
  {
    id: "stats-finished-only",
    title: "Parties terminées uniquement",
    aliases: [
      "parties terminees stats",
      "match en cours stats",
      "autosave stats",
      "partie en cours compte stats",
    ],
    text: md(
      "## PARTIES TERMINÉES",
      "Pour les records officiels, Awena privilégie les **parties terminées** de l'Historique. Un autosave `in_progress`, une reprise en cours ou une carte de match live ne doit pas gonfler artificiellement le nombre de matchs, les victoires ou les records.",
    ),
  },
  {
    id: "stats-zero-vs-missing",
    title: "Zéro ou donnée absente",
    aliases: [
      "zero ou donnee absente",
      "0 dans les stats",
      "statistique absente",
      "difference zero absent",
    ],
    text: md(
      "## 0 ≠ DONNÉE ABSENTE",
      "Une statistique enregistrée à **0** est une vraie valeur. Une statistique **absente** signifie que le match ne contient pas le champ nécessaire. Awena doit distinguer les deux : elle peut additionner un zéro, mais elle ne doit pas transformer une donnée inexistante en zéro si cela fausse un taux ou un record.",
    ),
  },
  {
    id: "stats-derived",
    title: "Statistique calculée",
    aliases: [
      "stat calculee",
      "stat derivee",
      "comment awena calcule",
      "statistique reconstruite",
    ],
    text: md(
      "## STATISTIQUE DÉRIVÉE",
      "Certaines valeurs sont stockées directement ; d'autres sont calculées à partir de données brutes. Exemples : **Win % = victoires / matchs**, **AVG3D = points / fléchettes × 3**, **CO % = sorties réussies / tentatives × 100**. Awena doit utiliser les données brutes lorsqu'elles existent, car elles donnent un agrégat plus exact sur plusieurs matchs.",
    ),
  },
  {
    id: "stats-weighted-average",
    title: "Moyenne pondérée",
    aliases: [
      "moyenne ponderee",
      "moyenne des moyennes",
      "calcul avg global",
      "avg3 globale",
    ],
    text: md(
      "## MOYENNE PONDÉRÉE",
      "Pour plusieurs matchs de durées différentes, faire la moyenne arithmétique des AVG3 de chaque match peut être trompeur. La méthode de référence est de cumuler les **points réellement scorés** et les **fléchettes réellement lancées**, puis de recalculer l'AVG3 globale.",
    ),
  },
  {
    id: "stats-dedupe",
    title: "Dédoublonnage des matchs",
    aliases: [
      "doublons historique stats",
      "match compte deux fois",
      "dedoublonnage stats",
      "partie double stats",
    ],
    text: md(
      "## DÉDOUBLONNAGE",
      "L'Historique possède un identifiant de match canonique. Les agrégateurs doivent éviter qu'un header, son payload restauré ou un ancien autosave soient comptés comme plusieurs parties différentes. Un même match ne doit contribuer qu'une fois au classement.",
    ),
  },
  {
    id: "stats-history-list",
    title: "History.list",
    aliases: [
      "history list",
      "liste complete historique",
      "lecture historique awena",
    ],
    text: md(
      "## LECTURE DE L'HISTORIQUE",
      "Awena démarre ses records depuis la **liste complète de l'Historique**. Le cache d'affichage rapide peut être vide au lancement ou limité : il sert à l'UI, pas à décider que les données statistiques n'existent pas.",
    ),
  },
  {
    id: "stats-history-get",
    title: "History.get et données détaillées",
    aliases: [
      "history get",
      "charger detail match",
      "payload complet stats",
      "ancienne partie detail",
    ],
    text: md(
      "## DONNÉES DÉTAILLÉES",
      "Si le résumé d'un match ne contient pas la métrique demandée, Awena peut recharger le **détail de chaque partie concernée** depuis l'Historique. Cela permet de récupérer des statistiques présentes uniquement dans d'anciens payloads, sans limiter arbitrairement le nombre de matchs du mode.",
    ),
  },
  {
    id: "stats-period-day",
    title: "Stats aujourd'hui",
    aliases: [
      "stats aujourd hui",
      "records aujourd hui",
      "stats du jour",
      "depuis ce matin",
    ],
    text: md(
      "## PÉRIODE — AUJOURD'HUI",
      "Une demande sur aujourd'hui doit filtrer les matchs par leur date enregistrée. Le classement est alors recalculé uniquement sur les parties terminées appartenant à cette période.",
    ),
  },
  {
    id: "stats-period-week",
    title: "Stats 7 jours",
    aliases: [
      "stats 7 jours",
      "records semaine",
      "derniere semaine stats",
      "sept jours stats",
    ],
    text: md(
      "## PÉRIODE — 7 JOURS",
      "Awena peut limiter un classement aux **7 derniers jours**. Les victoires, matchs et métriques du numérateur comme du dénominateur doivent tous respecter exactement la même période.",
    ),
  },
  {
    id: "stats-period-month",
    title: "Stats 1 mois",
    aliases: [
      "stats un mois",
      "stats 30 jours",
      "records mois",
      "dernier mois stats",
    ],
    text: md(
      "## PÉRIODE — 1 MOIS",
      "Pour une demande sur le dernier mois, Awena filtre l'Historique avant agrégation. Elle ne doit pas calculer un taux mensuel avec un nombre de matchs provenant de l'historique complet.",
    ),
  },
  {
    id: "stats-period-year",
    title: "Stats 1 an",
    aliases: [
      "stats un an",
      "stats annee",
      "records annee",
      "derniers 12 mois",
    ],
    text: md(
      "## PÉRIODE — 1 AN",
      "Le périmètre annuel ne contient que les parties de la fenêtre demandée. Un record historique et un record sur un an peuvent donc avoir des gagnants différents.",
    ),
  },
  {
    id: "stats-all-time",
    title: "Historique complet",
    aliases: [
      "stats all time",
      "records all time",
      "depuis toujours",
      "historique complet stats",
    ],
    text: md(
      "## ALL-TIME",
      "Sans période restrictive, Awena utilise toutes les parties terminées compatibles présentes dans l'Historique. C'est le périmètre de référence pour un record **all-time** local.",
    ),
  },
  {
    id: "stats-player-identity",
    title: "Identité d'un joueur",
    aliases: [
      "identifier joueur stats",
      "nom joueur change stats",
      "profil renomme stats",
      "id profil stats",
    ],
    text: md(
      "## IDENTITÉ JOUEUR",
      "L'identifiant du profil est plus fiable que le nom affiché. Si un joueur est renommé, les parties anciennes peuvent conserver l'ancien nom mais le même identifiant. Awena privilégie donc les IDs disponibles et utilise le nom comme fallback.",
    ),
  },
  {
    id: "stats-player-deleted",
    title: "Profil supprimé et Historique",
    aliases: [
      "profil supprime stats",
      "joueur supprime historique",
      "ancien joueur stats",
    ],
    text: md(
      "## PROFIL SUPPRIMÉ",
      "Une partie historique peut encore contenir un joueur dont le profil local a ensuite été supprimé. La partie reste une donnée historique ; Awena peut l'utiliser si elle possède encore une identité exploitable dans le match.",
    ),
  },
  {
    id: "stats-me",
    title: "Mes statistiques",
    aliases: [
      "mes stats",
      "mon record",
      "combien j ai",
      "mes records",
    ],
    text: md(
      "## « MES » STATS",
      "Quand le contexte permet d'identifier le joueur actif, Awena peut interpréter **moi / mes / mon** comme ce profil. Si l'identité est ambiguë, elle doit éviter d'attribuer les statistiques d'un autre joueur.",
    ),
  },
  {
    id: "stats-team-separation",
    title: "Individuel et équipe",
    aliases: [
      "stats equipe individuel",
      "classement equipes joueurs",
      "record equipe",
      "stats team",
    ],
    text: md(
      "## JOUEUR VS ÉQUIPE",
      "Une victoire d'équipe et une métrique individuelle ne sont pas nécessairement la même chose. Les parties en équipes peuvent conserver à la fois le résultat du camp et les statistiques personnelles ; Awena doit annoncer clairement ce qu'elle classe.",
    ),
  },
  {
    id: "stats-bot-history",
    title: "BOTS dans les statistiques",
    aliases: [
      "stats bots",
      "records bot ia",
      "bot dans historique",
      "classement bots",
    ],
    text: md(
      "## BOTS IA ET HISTORIQUE",
      "Un BOT peut apparaître dans les statistiques lorsqu'il est enregistré comme participant de la partie. Awena ne doit pas exclure automatiquement les BOTS d'un classement si la question porte sur tous les joueurs ; elle peut les distinguer si l'Historique conserve le marqueur `isBot`.",
    ),
  },
  {
    id: "stats-online-scope",
    title: "Local et Online",
    aliases: [
      "stats online local",
      "parties online stats",
      "classement online",
      "stats locales en ligne",
    ],
    text: md(
      "## LOCAL / ONLINE",
      "L'Historique peut contenir des matchs locaux et Online. Certains écrans séparent ces périmètres. Awena doit respecter un filtre explicite « local » ou « Online » et ne pas mélanger silencieusement des catégories que l'écran Stats distingue.",
    ),
  },
  {
    id: "stats-mode-scope",
    title: "Filtrer par mode",
    aliases: [
      "filtre mode stats",
      "stats uniquement x01",
      "records par jeu",
      "ne pas melanger modes",
    ],
    text: md(
      "## MODE DE JEU",
      "Chaque record est d'abord filtré par mode. Une moyenne X01 ne doit jamais inclure Cricket, Killer ou Training. De la même façon, un compteur de kills n'a de sens que dans un mode qui enregistre cette notion.",
    ),
  },
  {
    id: "stats-ambiguous-best",
    title: "Que veut dire meilleur joueur ?",
    aliases: [
      "meilleur joueur selon quoi",
      "qui est le meilleur",
      "meilleur profil stats",
      "meilleur joueur global",
    ],
    text: md(
      "## « MEILLEUR » SELON QUEL CRITÈRE ?",
      "Il n'existe pas toujours un meilleur joueur absolu. Win %, AVG3D, checkout, kills ou précision mesurent des qualités différentes. Si la question ne donne aucun critère, Awena doit préciser le critère utilisé ou proposer plusieurs indicateurs plutôt que d'inventer un classement universel.",
    ),
  },
  {
    id: "stats-ties",
    title: "Égalité dans un record",
    aliases: [
      "egalite record",
      "meme record",
      "ex aequo stats",
      "deux joueurs egalite",
    ],
    text: md(
      "## EX ÆQUO",
      "Deux joueurs peuvent avoir exactement la même valeur. Un classement fiable doit conserver cette réalité ; l'ordre d'affichage ne transforme pas automatiquement l'un des deux en meilleur statistiquement.",
    ),
  },
  {
    id: "stats-sample-size",
    title: "Taille de l'échantillon",
    aliases: [
      "nombre de parties minimum",
      "echantillon stats",
      "une seule partie record",
      "fiabilite moyenne stats",
    ],
    text: md(
      "## TAILLE D'ÉCHANTILLON",
      "Un excellent Win % sur une seule partie n'a pas la même portée qu'un taux proche sur cinquante matchs. Awena peut donner la valeur demandée, mais le **nombre de parties vérifiées** aide à l'interpréter correctement.",
    ),
  },
  {
    id: "x01-points",
    title: "Points scorés X01",
    aliases: [
      "points scores x01",
      "total points x01",
      "points marques x01",
    ],
    text: md(
      "## POINTS SCORÉS X01",
      "Le total de points scorés permet notamment de recalculer une moyenne pondérée lorsqu'il est associé au nombre de fléchettes. Ce total ne doit pas être confondu avec le score restant sur le compteur X01.",
    ),
  },
  {
    id: "x01-visits",
    title: "Volées / visites X01",
    aliases: [
      "nombre de volees x01",
      "visites x01 stats",
      "visits x01",
    ],
    text: md(
      "## VISITES X01",
      "Une **visite / volée** est le passage d'un joueur à la cible, généralement jusqu'à trois fléchettes. Le nombre de visites peut être enregistré directement ou reconstruit à partir du nombre de fléchettes dans certains anciens formats.",
    ),
  },
  {
    id: "x01-hits-total",
    title: "Hits totaux X01",
    aliases: [
      "hits totaux x01",
      "touches totales x01",
      "total hits x01",
    ],
    text: md(
      "## HITS TOTAUX",
      "Dans le comparateur X01, les hits totaux correspondent aux impacts **Simple + Double + Triple + Bull 25 + DBull 50**. Les MISS ne font pas partie des touches réussies.",
    ),
  },
  {
    id: "x01-miss-rate",
    title: "Miss % X01",
    aliases: [
      "miss % x01",
      "taux de miss x01",
      "pourcentage rates x01",
    ],
    text: md(
      "## MISS %",
      "Le Miss % est calculé comme `MISS ÷ fléchettes lancées × 100`. Il nécessite donc à la fois un compteur de MISS fiable et le nombre total de fléchettes.",
    ),
  },
  {
    id: "x01-simple-rate",
    title: "Simple % X01",
    aliases: [
      "simple % x01",
      "pourcentage simples x01",
      "taux simples x01",
    ],
    text: md(
      "## SIMPLE %",
      "Dans le comparateur X01, **Simple % = touches simples ÷ hits totaux × 100**. Le dénominateur est le nombre de touches, pas le nombre total de fléchettes.",
    ),
  },
  {
    id: "x01-double-rate",
    title: "Double % X01",
    aliases: [
      "double % x01",
      "pourcentage doubles x01",
      "taux doubles x01",
    ],
    text: md(
      "## DOUBLE %",
      "**Double % = doubles touchés ÷ hits totaux × 100** dans la convention du comparateur X01. Ce taux décrit la répartition des touches et n'est pas le taux de réussite au checkout.",
    ),
  },
  {
    id: "x01-triple-rate",
    title: "Triple % X01",
    aliases: [
      "triple % x01",
      "pourcentage triples x01",
      "taux triples x01",
    ],
    text: md(
      "## TRIPLE %",
      "**Triple % = triples touchés ÷ hits totaux × 100**. Il donne la part des touches réussies qui sont des triples.",
    ),
  },
  {
    id: "x01-bull-rate",
    title: "Bull % X01",
    aliases: [
      "bull % x01",
      "pourcentage bull x01",
      "taux bull x01",
    ],
    text: md(
      "## BULL %",
      "**Bull % = Bull 25 ÷ hits totaux × 100** dans le comparateur X01. Le DBull 50 possède un compteur et un pourcentage séparés.",
    ),
  },
  {
    id: "x01-dbull-rate",
    title: "DBull % X01",
    aliases: [
      "dbull % x01",
      "pourcentage dbull x01",
      "taux double bull x01",
    ],
    text: md(
      "## DBULL %",
      "**DBull % = DBull 50 ÷ hits totaux × 100**. Cette statistique est distincte du Bull 25 et du CO %.",
    ),
  },
  {
    id: "x01-bust-rate",
    title: "Bust % X01",
    aliases: [
      "bust % x01",
      "pourcentage bust x01",
      "taux bust x01",
    ],
    text: md(
      "## BUST %",
      "Le comparateur X01 rapporte le compteur Bust aux hits totaux pour son indicateur Bust %. Si les anciens matchs n'enregistrent pas les busts, Awena doit signaler que le taux ne peut pas être calculé sur ces données.",
    ),
  },
  {
    id: "x01-50plus",
    title: "50+ X01",
    aliases: [
      "50+ x01",
      "50 plus x01",
    ],
    text: md(
      "## 50+",
      "Certaines couches statistiques X01 peuvent reconstruire un seuil **50+** à partir des scores de volées détaillés. Si seuls les buckets historiques 60+/100+/140+/180 sont présents, Awena ne doit pas fabriquer un 50+ sans données de volées suffisantes.",
    ),
  },
  {
    id: "x01-80plus",
    title: "80+ X01",
    aliases: [
      "80+ x01",
      "80 plus x01",
    ],
    text: md(
      "## 80+",
      "Le comparateur X01 peut reconstruire **80+** à partir des volées détaillées. Ce seuil n'est pas garanti dans tous les anciens résumés ; Awena tente alors de relire les données détaillées du match avant de déclarer la statistique indisponible.",
    ),
  },
  {
    id: "x01-120plus",
    title: "120+ X01",
    aliases: [
      "120+ x01",
      "120 plus x01",
    ],
    text: md(
      "## 120+",
      "Comme 80+, le seuil **120+** peut nécessiter les scores de volées détaillés. Sa présence dans l'interface Stats ne signifie pas que tous les anciens matchs possèdent automatiquement l'information nécessaire.",
    ),
  },
  {
    id: "x01-legs-played",
    title: "Legs joués",
    aliases: [
      "legs joues x01",
      "nombre de legs x01",
      "manches jouees x01",
    ],
    text: md(
      "## LEGS JOUÉS",
      "Le nombre de legs joués sert de dénominateur au ratio de legs gagnés. Les structures modernes X01 enregistrent des cartes `legsPlayedByPlayer` / classements permettant de différencier legs joués et legs gagnés.",
    ),
  },
  {
    id: "x01-sets",
    title: "Sets X01",
    aliases: [
      "sets x01 stats",
      "sets gagnes x01",
      "sets joues x01",
      "ratio sets x01",
    ],
    text: md(
      "## SETS X01",
      "Les formats X01 à plusieurs sets peuvent conserver **sets gagnés** et, selon la sauvegarde, **sets joués**. Un taux de sets exige les deux valeurs ; s'il manque le dénominateur, Awena doit donner le nombre de sets gagnés plutôt qu'inventer un pourcentage.",
    ),
  },
  {
    id: "x01-start-score-filter",
    title: "301 / 501 / 701 / 901 dans les stats",
    aliases: [
      "stats 301",
      "stats 501",
      "stats 701",
      "stats 901",
      "filtrer score depart x01",
    ],
    text: md(
      "## SCORE DE DÉPART X01",
      "L'Historique moderne conserve le score de départ X01. Cela permet aux écrans statistiques compatibles de distinguer **301, 501, 701 et 901**. Comparer des moyennes entre formats différents reste possible, mais un filtre explicite doit être respecté lorsqu'il est demandé.",
    ),
  },
  {
    id: "x01-variant-filter",
    title: "Solo / Duo / Multi / Team dans les stats",
    aliases: [
      "stats x01 solo",
      "stats x01 duo",
      "stats x01 multi",
      "stats x01 team",
      "variante x01 stats",
    ],
    text: md(
      "## VARIANTE X01",
      "Le contexte X01 peut distinguer **Solo, Duo, Multi et Team**. Une statistique globale peut agréger plusieurs variantes si aucun filtre n'est demandé ; une question ciblée doit rester dans la variante indiquée.",
    ),
  },
  {
    id: "x01-format-filter",
    title: "Best Of / First To dans les stats",
    aliases: [
      "stats best of",
      "stats first to",
      "format match x01 stats",
      "bo ft statistiques",
    ],
    text: md(
      "## FORMAT DE MATCH",
      "Les sauvegardes X01 modernes conservent le mode de victoire et le format. Les écrans Stats peuvent donc filtrer les données selon **Best Of / First To** lorsque le contexte est disponible.",
    ),
  },
  {
    id: "x01-checkout-no-attempts",
    title: "CO % impossible sans tentatives",
    aliases: [
      "checkout sans tentatives",
      "co % indisponible",
      "pourquoi co 0",
      "tentatives checkout absentes",
    ],
    text: md(
      "## CO % ET ANCIENS MATCHS",
      "Un meilleur checkout peut exister même si les anciennes parties ne conservent pas le nombre de tentatives. Dans ce cas, **Best Checkout** reste exploitable mais **CO %** ne peut pas être recalculé honnêtement sans dénominateur.",
    ),
  },
  {
    id: "x01-score-input",
    title: "Saisie score et précision des stats",
    aliases: [
      "score input stats",
      "clavier stats x01",
      "cible tactile stats x01",
      "precision stats selon saisie",
    ],
    text: md(
      "## MÉTHODE DE SAISIE",
      "Le record X01 enregistre la méthode de saisie. Une saisie par score de volée peut suffire pour AVG3D, Best Visit et résultat, mais pas toujours pour connaître exactement S/D/T/Bull/MISS. Les statistiques d'impact nécessitent un historique suffisamment granulaire.",
    ),
  },
  {
    id: "stats-unavailable-answer",
    title: "Quand Awena ne possède pas la statistique",
    aliases: [
      "awena ne trouve pas stat",
      "stat indisponible awena",
      "donnee pas enregistree",
      "tu n as pas cette stat",
    ],
    text: md(
      "## STATISTIQUE INDISPONIBLE",
      "Awena doit d'abord chercher dans les résumés de **toutes les parties Historique** du mode, puis dans leurs détails si nécessaire. Si le champ ne peut toujours pas être reconstruit, la bonne réponse est : **la statistique n'est pas disponible dans les données enregistrées**, avec le nombre de matchs vérifiés — jamais une valeur inventée.",
    ),
  },
  {
    id: "stats-dynamic-mode-fields",
    title: "Stats propres à chaque mode",
    aliases: [
      "stat specifique mode",
      "stats originales mode",
      "champ statistique jeu",
      "awena toutes stats mode",
    ],
    text: md(
      "## MÉTRIQUES PROPRES AUX MODES",
      "Tous les modes n'ont pas le même vocabulaire. Après les métriques connues, Awena peut inspecter les **champs numériques réellement sauvegardés** par le mode et les rapprocher de la question. Si aucun champ fiable ne correspond, elle doit annoncer l'absence de donnée.",
    ),
  },
  {
    id: "stats-cache-refresh",
    title: "Rafraîchissement du cache Awena",
    aliases: [
      "cache awena stats",
      "rafraichir awena stats",
      "nouvelle partie pas visible awena",
      "stats awena pas a jour",
    ],
    text: md(
      "## CACHE AWENA",
      "Awena peut garder quelques secondes un index de l'Historique pour répondre vite. Les événements de mise à jour de l'Historique ou de l'index Stats invalident ce cache, afin qu'une nouvelle partie, un import ou une suppression soit pris en compte sans rester bloqué sur un ancien résultat.",
    ),
  },
  {
    id: "stats-performance",
    title: "Performance des recherches statistiques",
    aliases: [
      "stats awena lente",
      "records awena lent",
      "temps calcul stats",
      "pourquoi stats prennent du temps",
    ],
    text: md(
      "## PERFORMANCE",
      "Awena lit d'abord les résumés légers de l'Historique. Elle ne recharge les payloads complets que lorsque la métrique demandée l'exige. Les détails sont ensuite mis en cache brièvement : on garde ainsi **Historique comme source de vérité** sans décompresser toutes les parties à chaque question.",
    ),
  },
];

const ENTRIES: Entry[] = [...GENERAL, ...X01_METRICS, ...PRECISION];

function scoreEntry(entry: Entry, question: string, rememberedTopic?: string) {
  const q = norm(question);
  const qTokens = new Set(tokens(q));
  let score = 0;

  for (const aliasRaw of entry.aliases) {
    const alias = norm(aliasRaw);
    if (!alias) continue;

    if (q === alias) score += 20;
    else if (q.includes(alias) && alias.length >= 3) score += 11;

    for (const token of tokens(alias)) {
      if (qTokens.has(token)) score += 2;
    }
  }

  if (rememberedTopic === `advanced:${entry.id}`) score += 6;
  return score;
}

export function awenaAdvancedEncyclopediaCount() {
  return ENTRIES.length;
}

export function answerAwenaAdvancedEncyclopedia(
  question: string,
  context: AwenaRuntimeContext,
  rememberedTopic?: string,
): AwenaReply | null {
  const q = norm(question);
  if (!q) return null;

  let best: { entry: Entry; score: number } | null = null;

  for (const entry of ENTRIES) {
    const score = scoreEntry(entry, q, rememberedTopic);
    if (!best || score > best.score) best = { entry, score };
  }

  if (!best || best.score < 7) return null;

  const actions = best.entry.route
    ? [nav(best.entry.id, "Ouvrir la page concernée", best.entry.route)]
    : undefined;

  return {
    text: best.entry.text,
    actions,
    modeId: context.mode || null,
    knowledgeTopic: `advanced:${best.entry.id}`,
  };
}
