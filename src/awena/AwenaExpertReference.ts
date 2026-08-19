import type { AwenaReply, AwenaRuntimeContext } from "./awena.types";

type ExpertDomain = "darts" | "petanque" | "pingpong" | "molkky" | "football" | "babyfoot" | "dice" | "stats" | "competition" | "app";
type ExpertEntry = {
  id: string;
  domain: ExpertDomain;
  title: string;
  aliases: string[];
  text: string;
  source?: string;
};

const STOP = new Set([
  "a", "au", "aux", "avec", "ce", "ces", "cette", "de", "des", "du", "dans", "et", "est", "en", "je", "la", "le", "les",
  "ma", "mes", "mon", "ne", "nous", "on", "ou", "pour", "que", "quel", "quelle", "quels", "quelles", "qui", "quoi", "se", "son",
  "sur", "ta", "te", "tes", "ton", "tu", "un", "une", "vos", "votre", "comment", "pourquoi", "faire", "sert", "signifie", "veut",
  "dire", "fonctionne", "explique", "expliquer", "moi", "regle", "regles", "règle", "règles",
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

function md(...lines: string[]) { return lines.join("\n"); }

const ENTRIES: ExpertEntry[] = [
  // ---------------------------------------------------------------------------
  // FLÉCHETTES — culture générale, matériel, vocabulaire et stratégie
  // ---------------------------------------------------------------------------
  {
    id: "darts-board-scoring", domain: "darts", title: "Fléchettes · zones et valeurs",
    aliases: ["zones cible flechettes", "valeur simple double triple bull", "comment compte cible flechettes", "secteurs flechettes"],
    text: md(
      "## CIBLE DE FLÉCHETTES — VALEURS",
      "Une cible standard possède les secteurs **1 à 20**. La grande zone simple vaut le numéro, l'anneau extérieur étroit vaut **Double**, l'anneau intérieur étroit vaut **Triple**.",
      "",
      "- **BULL extérieur** : 25 points ;",
      "- **DBULL / Bullseye** : 50 points ;",
      "- meilleur score avec une seule fléchette : **T20 = 60** ;",
      "- meilleure volée classique de 3 fléchettes : **180 = T20 + T20 + T20**.",
      "",
      "> Dans MULTISPORTS SCORING, un mode peut détourner ces zones pour leur donner une fonction spéciale : il faut alors appliquer la règle du mode actif plutôt que le score classique.",
    ),
    source: "WDF / conventions internationales du jeu de fléchettes",
  },
  {
    id: "darts-board-setup", domain: "darts", title: "Fléchettes · installation de la cible",
    aliases: ["hauteur cible flechettes", "distance cible flechettes", "distance oche", "1 73 flechettes", "2 37 flechettes", "installer cible darts"],
    text: md(
      "## INSTALLATION STANDARD D'UNE CIBLE",
      "Pour une cible traditionnelle de steel darts, la référence de compétition place le **centre du Bull à 1,73 m du sol** et la ligne de lancer à **2,37 m horizontalement** de la face de la cible.",
      "",
      "La mesure diagonale Bull → ligne de lancer est couramment utilisée comme contrôle complémentaire. Une installation régulière est essentielle : quelques centimètres d'écart changent la mécanique du geste.",
    ),
    source: "World Darts Federation — règles d'installation / oche",
  },
  {
    id: "darts-visit-leg-set", domain: "darts", title: "Fléchettes · volée, leg et set",
    aliases: ["vollee leg set flechettes", "difference leg set darts", "c est quoi une volee flechettes", "visit darts"],
    text: md(
      "## VOLÉE / VISIT",
      "Une **volée** (visit) correspond au passage d'un joueur à l'oche, généralement jusqu'à **3 fléchettes**.",
      "",
      "## LEG",
      "Un **leg** est une manche complète. En X01, il commence au score choisi et se termine lorsqu'un joueur atteint exactement zéro selon la règle OUT.",
      "",
      "## SET",
      "Un **set** regroupe plusieurs legs. Un match peut être joué en Best Of de legs, en sets composés de legs, ou sans sets selon la configuration.",
    ),
  },
  {
    id: "darts-bust", domain: "darts", title: "Fléchettes · bust",
    aliases: ["bust flechettes", "bust x01", "pourquoi score revient avant volee", "depasse zero x01", "score 1 double out"],
    text: md(
      "## BUST EN X01",
      "Un **bust** annule la volée en cours et restaure le score du début de cette volée lorsque la tentative de finition devient invalide.",
      "",
      "Exemples typiques en **Double Out** : passer sous zéro, arriver à **1** alors qu'il faut finir sur un double, ou atteindre zéro sans terminer par un double. Les conditions exactes suivent le réglage OUT choisi dans l'application.",
    ),
  },
  {
    id: "darts-double-in-out-master", domain: "darts", title: "Fléchettes · In / Out",
    aliases: ["simple in double in master in", "simple out double out master out", "difference double out master out", "regle in out x01"],
    text: md(
      "## RÈGLES IN / OUT EN X01",
      "- **Simple In** : le scoring commence immédiatement ;",
      "- **Double In** : il faut d'abord toucher un double valide pour ouvrir son score ;",
      "- **Simple Out** : toute touche exacte pouvant amener à zéro peut finir ;",
      "- **Double Out** : la dernière fléchette doit être un double ;",
      "- **Master Out** : la finition autorise généralement un **Double ou un Triple**, selon l'implémentation du mode.",
      "",
      "> Awena doit toujours se baser sur la configuration active avant de proposer une sortie.",
    ),
  },
  {
    id: "darts-checkout", domain: "darts", title: "Fléchettes · checkout",
    aliases: ["checkout flechettes", "sortie x01", "finition x01", "route checkout", "table checkout"],
    text: md(
      "## CHECKOUT",
      "Un **checkout** est une combinaison qui termine un leg X01 en atteignant exactement zéro selon la règle OUT active.",
      "",
      "La meilleure route n'est pas toujours celle qui maximise les points : on cherche aussi à **laisser une finition confortable**, à éviter les nombres gênants et à conserver une solution si la première fléchette manque sa cible.",
      "",
      "Dans une partie en direct, Awena peut utiliser le score restant, le nombre de fléchettes disponibles et la règle OUT pour proposer une route adaptée.",
    ),
  },
  {
    id: "darts-170", domain: "darts", title: "Fléchettes · checkout 170",
    aliases: ["170 checkout", "plus gros checkout", "t20 t20 bull", "sortie maximale x01"],
    text: md(
      "## 170 — CHECKOUT MAXIMAL CLASSIQUE",
      "En X01 traditionnel avec trois fléchettes et Double Out, **170** est la plus haute sortie possible : **T20 → T20 → DBULL**.",
      "",
      "Un score supérieur à 170 n'est donc pas une sortie directe en trois fléchettes dans ce cadre : il faut d'abord préparer le tour suivant.",
    ),
  },
  {
    id: "darts-setup-shot", domain: "darts", title: "Fléchettes · setup shot",
    aliases: ["setup shot darts", "preparer un double", "laisser un double x01", "score de preparation x01"],
    text: md(
      "## SETUP SHOT",
      "Un **setup shot** est une volée jouée non pour finir immédiatement, mais pour laisser une sortie forte au passage suivant.",
      "",
      "Exemple de logique : lorsqu'un checkout est improbable ou impossible, mieux vaut parfois quitter un nombre permettant une route naturelle vers **D16, D20, D18 ou Bull**, plutôt que scorer au maximum sans plan de finition.",
    ),
  },
  {
    id: "darts-cover-shot", domain: "darts", title: "Fléchettes · cover shot",
    aliases: ["cover shot darts", "t19 au lieu de t20", "pourquoi viser 19 flechettes", "switch 20 19 darts"],
    text: md(
      "## COVER SHOT / SWITCH",
      "Quand la ligne du **T20** est masquée par une fléchette ou qu'une route de checkout l'exige, un joueur peut basculer vers **T19, T18 ou une autre cible**. C'est un cover shot ou un switch.",
      "",
      "Ce changement n'est pas un aveu d'échec : il sert à conserver un angle propre, une route mathématique ou une meilleure probabilité de gros score.",
    ),
  },
  {
    id: "darts-grouping", domain: "darts", title: "Fléchettes · groupement",
    aliases: ["groupement flechettes", "darts grouping", "flechettes groupees", "precision groupement"],
    text: md(
      "## GROUPEMENT",
      "Le **groupement** mesure à quel point les fléchettes arrivent proches les unes des autres. Un groupement serré indique un geste répétable, même s'il est légèrement décalé de la cible visée.",
      "",
      "Pour progresser, il est souvent utile de corriger d'abord la **dispersion** puis le centrage : un geste régulier est plus facile à régler qu'un geste aléatoire.",
    ),
  },
  {
    id: "darts-stance-release", domain: "darts", title: "Fléchettes · posture et lâcher",
    aliases: ["posture flechettes", "lacher flechette", "stance darts", "geste flechettes", "follow through darts"],
    text: md(
      "## BASES TECHNIQUES",
      "Une mécanique stable recherche surtout **répétabilité et équilibre** : appuis constants, tête relativement fixe, coude contrôlé, accélération fluide de l'avant-bras et accompagnement du geste après le lâcher.",
      "",
      "Il n'existe pas une posture unique valable pour tous. Le bon repère est celle qui permet de reproduire la même ligne de lancer sans tension inutile.",
    ),
  },
  {
    id: "darts-cricket-marks", domain: "darts", title: "Cricket · marques",
    aliases: ["marques cricket", "marks cricket darts", "simple double triple cricket", "fermer une cible cricket"],
    text: md(
      "## MARQUES AU CRICKET",
      "Sur une cible Cricket active, un **Simple = 1 marque**, un **Double = 2 marques** et un **Triple = 3 marques**. Trois marques ferment la cible pour ce joueur ou cette équipe.",
      "",
      "Dans la variante avec points, une cible déjà fermée par toi peut encore scorer tant qu'un adversaire ne l'a pas lui-même fermée.",
    ),
  },
  {
    id: "darts-cricket-strategy", domain: "darts", title: "Cricket · stratégie",
    aliases: ["strategie cricket", "cricket points ou fermeture", "quand scorer cricket", "tactique cricket darts"],
    text: md(
      "## STRATÉGIE CRICKET",
      "Le compromis central est **fermer vs scorer**. Fermer rapidement réduit les options adverses ; scorer sur une cible déjà fermée crée un matelas de points.",
      "",
      "Une bonne décision dépend du différentiel de points, des cibles encore ouvertes et du niveau de chaque joueur sur les segments concernés.",
    ),
  },
  {
    id: "darts-shanghai", domain: "darts", title: "Shanghai · combinaison",
    aliases: ["c est quoi un shanghai", "simple double triple meme numero", "shanghai flechettes combinaison"],
    text: md(
      "## SHANGHAI",
      "Un **Shanghai** est la combinaison **Simple + Double + Triple du même numéro dans une seule volée**. L'ordre des trois touches n'est généralement pas important.",
      "",
      "Selon la variante, réussir un Shanghai peut donner une victoire immédiate ou simplement constituer un événement exceptionnel de la manche.",
    ),
  },
  {
    id: "darts-accuracy-v-scoring", domain: "darts", title: "Fléchettes · précision vs scoring",
    aliases: ["precision ou scoring flechettes", "moyenne vs precision darts", "bien jouer sans grosse moyenne", "accuracy darts"],
    text: md(
      "## PRÉCISION ≠ MOYENNE",
      "La moyenne X01 mesure le **rendement en points**, pas directement la précision géométrique. Un joueur peut être très précis sur des doubles ou des objectifs faibles sans afficher une énorme AVG3D.",
      "",
      "Pour analyser un profil complet, combine moyenne, taux de doubles/checkouts, distribution S/D/T, Best Visit, constance et réussite sur les cibles réellement demandées par le mode.",
    ),
  },

  // ---------------------------------------------------------------------------
  // PÉTANQUE — règles de référence, technique, stratégie et vocabulaire
  // ---------------------------------------------------------------------------
  {
    id: "petanque-13", domain: "petanque", title: "Pétanque · score de référence",
    aliases: ["13 points petanque", "combien de points petanque", "score victoire petanque", "partie petanque 13"],
    text: md(
      "## SCORE DE RÉFÉRENCE",
      "Une partie de pétanque de référence se joue à **13 points**. Certaines compétitions peuvent utiliser 11 points dans des phases particulières, mais 13 reste la norme générale.",
      "",
      "> MULTISPORTS SCORING peut proposer un score cible configurable : la configuration de la partie prévaut alors pour le suivi dans l'application.",
    ),
    source: "FIPJP — Règlement officiel pour le sport de pétanque",
  },
  {
    id: "petanque-jack-distance", domain: "petanque", title: "Pétanque · distance du but",
    aliases: ["distance but petanque", "distance cochonnet", "6 10 metres petanque", "lancer but petanque"],
    text: md(
      "## DISTANCE DU BUT",
      "Pour Juniors et Seniors dans le règlement international de référence, le but doit être lancé à une distance comprise entre **6 m et 10 m** depuis le bord intérieur du cercle, sous réserve des autres conditions de validité du terrain.",
      "",
      "La longueur choisie influence fortement la tactique : un but long favorise souvent des gestes et trajectoires différents d'un but court.",
    ),
    source: "FIPJP — règlement officiel, conditions de validité du lancer du but",
  },
  {
    id: "petanque-boules-format", domain: "petanque", title: "Pétanque · nombre de boules",
    aliases: ["combien de boules petanque", "boules tete a tete doublette triplette", "3 boules 2 boules petanque"],
    text: md(
      "## NOMBRE DE BOULES PAR JOUEUR",
      "Dans les formats traditionnels :",
      "- **tête-à-tête** : 3 boules par joueur ;",
      "- **doublette** : 3 boules par joueur ;",
      "- **triplette** : 2 boules par joueur.",
      "",
      "Les variantes de MULTISPORTS SCORING peuvent proposer d'autres compositions ou compensations : Awena doit alors annoncer clairement qu'il s'agit d'une variante de l'application.",
    ),
    source: "FIPJP — formats de jeu",
  },
  {
    id: "petanque-pointing", domain: "petanque", title: "Pétanque · pointer",
    aliases: ["pointer petanque", "pointage petanque", "pointeur petanque", "comment pointer boule"],
    text: md(
      "## POINTER",
      "**Pointer** consiste à placer sa boule le plus près possible du but, en contrôlant le point de chute, la hauteur de trajectoire, la vitesse et la réaction du terrain.",
      "",
      "Trois familles courantes : **roulette**, **demi-portée** et **portée**. Le choix dépend de la nature du sol et des obstacles entre le cercle et le but.",
    ),
  },
  {
    id: "petanque-shooting", domain: "petanque", title: "Pétanque · tirer",
    aliases: ["tirer petanque", "tir petanque", "tireur petanque", "tir au fer petanque"],
    text: md(
      "## TIRER",
      "**Tirer** consiste à frapper une boule adverse pour l'enlever ou la déplacer. Le tir au fer vise une arrivée directe ou quasi directe sur la boule cible.",
      "",
      "Le tir devient particulièrement rentable quand la boule adverse est très bien placée, bloque plusieurs points ou lorsque pointer est trop difficile.",
    ),
  },
  {
    id: "petanque-carreau", domain: "petanque", title: "Pétanque · carreau",
    aliases: ["carreau petanque", "faire un carreau", "carreau sur place", "tir reussi carreau"],
    text: md(
      "## CARREAU",
      "Un **carreau** est un tir où la boule tirée remplace avantageusement la boule frappée, idéalement en restant presque sur place. C'est plus fort qu'un simple tir réussi car on enlève une boule adverse **et** on garde une boule bien placée.",
      "",
      "Dans les statistiques de l'application, il est pertinent de distinguer **tir tenté**, **tir réussi** et **carreau**.",
    ),
  },
  {
    id: "petanque-bec", domain: "petanque", title: "Pétanque · bec",
    aliases: ["bec petanque", "faire un bec petanque", "bec boule"],
    text: md(
      "## BEC",
      "Un **bec** est un contact volontaire ou opportun avec une boule déjà en jeu pour dévier ou freiner sa propre boule et améliorer sa position.",
      "",
      "C'est une action de pointage technique : sa réussite dépend énormément de l'angle et de la vitesse d'arrivée.",
    ),
  },
  {
    id: "petanque-trou", domain: "petanque", title: "Pétanque · trou",
    aliases: ["trou petanque", "faire un trou au tir", "tir rate trou"],
    text: md(
      "## TROU",
      "Au tir, faire un **trou** signifie manquer la boule visée sans contact utile. C'est un indicateur distinct d'un tir réussi et peut servir à mesurer la précision du tireur.",
    ),
  },
  {
    id: "petanque-measure", domain: "petanque", title: "Pétanque · mesure du point",
    aliases: ["mesurer point petanque", "quelle boule est plus pres", "mesure petanque", "litige distance but boule"],
    text: md(
      "## MESURE DU POINT",
      "Quand l'œil ne suffit pas, il faut mesurer la distance entre le but et les boules concernées avec un instrument adapté. Le point est déterminé par la **boule la plus proche du but**, pas par l'impression visuelle depuis le cercle.",
      "",
      "Dans l'application, l'outil de mesure ou l'enregistrement du point ne remplace pas l'arbitrage réel sur le terrain.",
    ),
  },
  {
    id: "petanque-mene", domain: "petanque", title: "Pétanque · mène",
    aliases: ["mene petanque", "c est quoi une mene", "fin de mene petanque", "qui rejoue apres mene"],
    text: md(
      "## MÈNE",
      "Une **mène** est l'unité de jeu comprise entre le lancer du but et l'attribution des points lorsque toutes les boules utiles ont été jouées.",
      "",
      "À la fin, **un seul camp marque** : il inscrit autant de points qu'il possède de boules mieux placées que la meilleure boule adverse.",
    ),
  },
  {
    id: "petanque-strategy", domain: "petanque", title: "Pétanque · stratégie de mène",
    aliases: ["strategie petanque", "pointer ou tirer petanque", "tactique petanque", "gestion boules petanque"],
    text: md(
      "## POINTER OU TIRER ?",
      "La bonne décision dépend du nombre de boules restantes, de la qualité du point adverse, du terrain et du risque de donner plusieurs points.",
      "",
      "Avant chaque boule, compte les ressources restantes : **combien de boules chez nous, combien chez eux, quel est le point actuel et quel scénario maximise le gain tout en limitant une grosse mène adverse ?**",
    ),
  },

  // ---------------------------------------------------------------------------
  // TENNIS DE TABLE / PING-PONG
  // ---------------------------------------------------------------------------
  {
    id: "pingpong-11-deuce", domain: "pingpong", title: "Ping-Pong · 11 points et deuce",
    aliases: ["11 points ping pong", "deuce ping pong", "10 10 ping pong", "deux points ecart ping pong"],
    text: md(
      "## SCORE OFFICIEL DE RÉFÉRENCE",
      "Une manche de tennis de table se gagne à **11 points**, avec **2 points d'écart**. À 10–10, le jeu continue jusqu'à ce qu'un joueur ou une paire prenne deux points d'avance.",
      "",
      "> MULTISPORTS SCORING autorise aussi des presets Fun ou Custom : le score configuré dans l'application peut donc différer de cette référence.",
    ),
    source: "ITTF — Laws of Table Tennis / Table Tennis 101",
  },
  {
    id: "pingpong-service-rotation", domain: "pingpong", title: "Ping-Pong · alternance du service",
    aliases: ["service tous les 2 ping pong", "alternance service ping pong", "qui sert a 10 10", "service deuce ping pong"],
    text: md(
      "## ALTERNANCE DU SERVICE",
      "Dans le format officiel courant, le serveur change après **2 points**. À **10–10**, le service alterne après **chaque point** jusqu'à la fin de la manche.",
      "",
      "L'application peut proposer d'autres fréquences de service : vérifie le preset actif avant d'appliquer cette règle à une partie suivie par MULTISPORTS SCORING.",
    ),
    source: "ITTF — règles de jeu",
  },
  {
    id: "pingpong-service-toss", domain: "pingpong", title: "Ping-Pong · lancer de balle au service",
    aliases: ["16 cm service ping pong", "lancer balle service ping pong", "service legal tennis de table", "hauteur lancer service"],
    text: md(
      "## SERVICE — LANCER DE BALLE",
      "Dans la règle internationale, la balle doit être lancée presque verticalement depuis la paume ouverte et monter d'au moins **16 cm** avant d'être frappée, sans être cachée au receveur.",
      "",
      "L'objectif est de rendre le service observable et équitable, notamment sur l'effet imprimé à la balle.",
    ),
    source: "ITTF — Laws of Table Tennis / procédures de service",
  },
  {
    id: "pingpong-let", domain: "pingpong", title: "Ping-Pong · let",
    aliases: ["let ping pong", "service filet ping pong", "balle touche filet au service", "service a refaire ping pong"],
    text: md(
      "## LET AU SERVICE",
      "Si un service est autrement correct mais touche le filet avant d'arriver correctement dans le camp adverse, l'échange est **à rejouer** : c'est un let.",
      "",
      "Un filet touché pendant un échange normal ne provoque pas automatiquement un let : la balle reste jouable si elle franchit correctement le filet et rebondit sur la table.",
    ),
  },
  {
    id: "pingpong-edge", domain: "pingpong", title: "Ping-Pong · bord de table",
    aliases: ["edge ping pong", "bord table point", "balle touche bord ping pong", "arete table tennis"],
    text: md(
      "## BORD / EDGE",
      "Une balle qui touche **le dessus de la surface de jeu**, y compris son arête supérieure, peut être valable. Une balle qui ne touche que le côté vertical de la table n'est pas considérée comme ayant rebondi sur la surface de jeu.",
      "",
      "C'est une distinction importante dans les points très rasants.",
    ),
  },
  {
    id: "pingpong-doubles-order", domain: "pingpong", title: "Ping-Pong · ordre en double",
    aliases: ["ordre double ping pong", "alternance joueurs double tennis de table", "2v2 ping pong qui frappe"],
    text: md(
      "## DOUBLE — ALTERNANCE DES FRAPPES",
      "En double, les partenaires doivent frapper la balle **à tour de rôle**. L'ordre du service et de la réception organise donc toute la rotation du point.",
      "",
      "MULTISPORTS SCORING peut suivre le score d'un 2V2 sans arbitrer physiquement chaque alternance : la règle sportive reste à respecter à la table.",
    ),
  },
  {
    id: "pingpong-spin", domain: "pingpong", title: "Ping-Pong · effets",
    aliases: ["effet ping pong", "topspin backspin sidespin", "rotation balle tennis de table", "lire effet ping pong"],
    text: md(
      "## EFFETS PRINCIPAUX",
      "- **Topspin** : rotation avant, trajectoire plongeante et rebond qui accélère ;",
      "- **Backspin / coupe** : rotation arrière, balle qui freine et tend à descendre dans la raquette adverse ;",
      "- **Sidespin** : rotation latérale, déviation latérale au rebond et au contact de la raquette.",
      "",
      "Lire l'orientation de la raquette adverse au contact aide à anticiper l'effet.",
    ),
  },
  {
    id: "pingpong-third-ball", domain: "pingpong", title: "Ping-Pong · troisième balle",
    aliases: ["troisieme balle ping pong", "third ball attack", "service remise attaque ping pong"],
    text: md(
      "## TROISIÈME BALLE",
      "La **third-ball attack** est un schéma : 1) service, 2) remise adverse, 3) première attaque préparée par le serveur. Le service n'est donc pas seulement une tentative de point direct : il sert à provoquer une remise prévisible.",
      "",
      "C'est une notion stratégique importante pour comprendre pourquoi la qualité du service influence tout l'échange.",
    ),
    source: "ITTF — documentation technique sur le service",
  },
  {
    id: "pingpong-rally-stats", domain: "pingpong", title: "Ping-Pong · statistiques utiles",
    aliases: ["stats ping pong utiles", "analyser match ping pong", "service points won ping pong", "erreurs ping pong stats"],
    text: md(
      "## ANALYSER UN MATCH DE PING-PONG",
      "Au-delà du score, les indicateurs utiles sont : points gagnés au service, points gagnés en réception, séries de points, performance au deuce, sets serrés et efficacité dans les phases décisives.",
      "",
      "Si une métrique n'est pas enregistrée par l'application, Awena ne doit pas la reconstruire artificiellement.",
    ),
  },

  // ---------------------------------------------------------------------------
  // MÖLKKY
  // ---------------------------------------------------------------------------
  {
    id: "molkky-12-pins", domain: "molkky", title: "Mölkky · matériel",
    aliases: ["12 quilles molkky", "combien de quilles molkky", "materiel molkky", "numeros quilles 1 12"],
    text: md(
      "## MATÉRIEL MÖLKKY",
      "Le jeu utilise un bâton de lancer — le **Mölkky** — et **12 quilles numérotées de 1 à 12**. Après chaque lancer, les quilles tombées sont relevées à l'endroit où elles se sont immobilisées.",
      "",
      "La disposition s'étale donc progressivement et transforme la stratégie au fil de la partie.",
    ),
    source: "Mölkky — règles de jeu officielles",
  },
  {
    id: "molkky-scoring", domain: "molkky", title: "Mölkky · comptage",
    aliases: ["une quille plusieurs quilles molkky", "score quilles molkky", "comment compter molkky", "points molkky"],
    text: md(
      "## COMPTAGE",
      "- **exactement 1 quille tombe** : tu marques le numéro inscrit dessus ;",
      "- **2 quilles ou plus tombent** : tu marques le **nombre de quilles tombées**, pas la somme de leurs numéros.",
      "",
      "Une quille appuyée sur une autre quille ou sur le bâton et qui n'est pas réellement au sol ne compte pas comme tombée selon la règle de référence.",
    ),
    source: "Mölkky — règles de jeu officielles",
  },
  {
    id: "molkky-exact-50", domain: "molkky", title: "Mölkky · exactement 50",
    aliases: ["exactement 50 molkky", "depasser 50 molkky", "retour 25 molkky", "51 molkky"],
    text: md(
      "## OBJECTIF : EXACTEMENT 50",
      "Dans la règle classique, il faut atteindre **exactement 50 points**. Si le score dépasse 50, il redescend à **25**.",
      "",
      "Cette règle crée une phase de finition comparable à un checkout : plus on approche de 50, plus il faut choisir précisément la quille ou le nombre de quilles à faire tomber.",
    ),
    source: "Mölkky — règles de jeu officielles",
  },
  {
    id: "molkky-three-misses", domain: "molkky", title: "Mölkky · trois échecs",
    aliases: ["3 miss molkky", "trois rates molkky", "elimination molkky", "trois lancers sans quille"],
    text: md(
      "## TROIS LANCERS NULS CONSÉCUTIFS",
      "Dans la règle de référence, un joueur ou une équipe qui ne fait tomber aucune quille **trois tours de suite** est éliminé.",
      "",
      "MULTISPORTS SCORING permet d'activer ou désactiver cette logique dans certaines configurations : l'état du réglage doit être vérifié.",
    ),
    source: "Mölkky — règles de jeu officielles",
  },
  {
    id: "molkky-strategy", domain: "molkky", title: "Mölkky · stratégie",
    aliases: ["strategie molkky", "tactique molkky", "quelle quille viser molkky", "fin de partie molkky"],
    text: md(
      "## STRATÉGIE MÖLKKY",
      "Au début, faire tomber plusieurs quilles peut être facile ; ensuite, la dispersion rend les numéros élevés plus accessibles individuellement.",
      "",
      "Approche de 50 : calcule le score exact requis **avant** de lancer. Si tu as 44, viser la quille 6 peut finir immédiatement ; viser un groupe de 6 quilles peut aussi rapporter 6, mais le risque et l'angle sont différents.",
    ),
  },
  {
    id: "molkky-layout-evolves", domain: "molkky", title: "Mölkky · terrain évolutif",
    aliases: ["relever quilles ou elles tombent", "placement quilles apres lancer molkky", "disposition molkky change"],
    text: md(
      "## UN TERRAIN QUI CHANGE À CHAQUE LANCER",
      "Les quilles ne reviennent pas à la formation initiale après chaque tour : elles sont relevées **à leur nouvelle position**. Le plateau de jeu s'étire et se fragmente.",
      "",
      "C'est ce qui fait passer le Mölkky d'un simple jeu d'adresse à un jeu de placement et de planification.",
    ),
    source: "Mölkky — règles de jeu officielles",
  },

  // ---------------------------------------------------------------------------
  // FOOTBALL — lois et lecture du match
  // ---------------------------------------------------------------------------
  {
    id: "football-11", domain: "football", title: "Football · nombre de joueurs",
    aliases: ["11 joueurs football", "combien de joueurs foot", "nombre joueurs terrain football", "gardien plus 10"],
    text: md(
      "## FOOTBALL À 11",
      "Le format traditionnel oppose **deux équipes de 11 joueurs**, dont un gardien par équipe. Les formats 5V5, 7V7, 8V8 ou autres sont des formats adaptés avec leurs propres dimensions et règles de compétition.",
      "",
      "> MULTISPORTS SCORING propose plusieurs formats ; le format sélectionné détermine l'effectif suivi par l'application.",
    ),
    source: "IFAB — Law 3, The Players",
  },
  {
    id: "football-duration", domain: "football", title: "Football · durée",
    aliases: ["90 minutes football", "2x45 foot", "duree match football", "mi temps football"],
    text: md(
      "## DURÉE DE RÉFÉRENCE",
      "Un match senior à 11 de référence comporte **deux périodes de 45 minutes**, avec une mi-temps dont la durée est encadrée par les lois et le règlement de compétition.",
      "",
      "Les formats réduits de MULTISPORTS SCORING utilisent des durées plus courtes configurées par format : elles ne doivent pas être confondues avec le 11V11 officiel.",
    ),
    source: "IFAB — Law 7, The Duration of the Match",
  },
  {
    id: "football-offside", domain: "football", title: "Football · hors-jeu",
    aliases: ["hors jeu football", "offside foot", "quand hors jeu", "position hors jeu"],
    text: md(
      "## HORS-JEU — PRINCIPE",
      "Être en **position de hors-jeu** n'est pas automatiquement une faute. L'infraction apparaît lorsqu'un joueur, placé en position de hors-jeu au moment où un coéquipier joue ou touche le ballon, participe ensuite activement à l'action selon les critères des Lois du Jeu.",
      "",
      "Il n'y a notamment pas d'infraction de hors-jeu lorsqu'un joueur reçoit directement le ballon sur certaines reprises prévues par la loi, comme une **touche, un coup de pied de but ou un corner**.",
    ),
    source: "IFAB — Law 11, Offside",
  },
  {
    id: "football-penalty", domain: "football", title: "Football · penalty",
    aliases: ["penalty football", "distance penalty foot", "joueurs penalty", "gardien ligne penalty"],
    text: md(
      "## PENALTY",
      "Lors d'un penalty, le tireur affronte le gardien depuis le point de penalty. Les autres joueurs doivent respecter les positions et distances imposées jusqu'à ce que le ballon soit en jeu.",
      "",
      "Le gardien doit rester sur sa ligne de but, entre les poteaux, face au tireur jusqu'au moment réglementaire du tir.",
    ),
    source: "IFAB — Law 14, The Penalty Kick",
  },
  {
    id: "football-yellow-red", domain: "football", title: "Football · cartons",
    aliases: ["carton jaune rouge football", "jaune foot", "rouge foot", "avertissement exclusion football"],
    text: md(
      "## DISCIPLINE",
      "Le **carton jaune** matérialise un avertissement ; le **carton rouge** entraîne l'exclusion du joueur. Les motifs précis relèvent des Lois du Jeu et de l'appréciation arbitrale.",
      "",
      "MULTISPORTS SCORING peut enregistrer ces événements dans le fil du match afin de les inclure dans les statistiques et l'historique.",
    ),
    source: "IFAB — Law 12, Fouls and Misconduct",
  },
  {
    id: "football-own-goal", domain: "football", title: "Football · but contre son camp",
    aliases: ["csc football", "but contre son camp", "own goal foot", "autogoal foot"],
    text: md(
      "## BUT CONTRE SON CAMP",
      "Un **CSC / own goal** est crédité comme but de l'équipe adverse mais identifié comme ayant été marqué contre son propre camp. Le suivi séparé est utile pour ne pas attribuer artificiellement ce but à un attaquant adverse.",
    ),
  },
  {
    id: "football-assist", domain: "football", title: "Football · passe décisive",
    aliases: ["passe decisive football", "assist foot", "stat passe decisive", "qui a fait la passe but"],
    text: md(
      "## PASSE DÉCISIVE",
      "La **passe décisive** est une statistique d'analyse, pas une catégorie universellement définie dans les Lois du Jeu. Les fournisseurs de données peuvent appliquer des critères légèrement différents.",
      "",
      "Dans MULTISPORTS SCORING, elle doit être comprise comme l'événement réellement enregistré par l'utilisateur pour le but concerné.",
    ),
  },
  {
    id: "football-shot-on-target", domain: "football", title: "Football · tir cadré",
    aliases: ["tir cadre football", "shot on target", "tir non cadre", "poteau tir cadre"],
    text: md(
      "## TIR CADRÉ",
      "Un tir cadré est une tentative qui aurait fini dans le but sans l'intervention du gardien ou d'un défenseur sur la ligne, selon la convention statistique utilisée.",
      "",
      "Un poteau n'est pas automatiquement un tir cadré : les conventions de données peuvent varier. L'application doit conserver la catégorie saisie pendant le match plutôt que la réinterpréter après coup.",
    ),
  },
  {
    id: "football-possession-caution", domain: "football", title: "Football · possession",
    aliases: ["possession football", "pourcentage possession foot", "avoir 60 possession", "possession ne veut pas dire gagner"],
    text: md(
      "## POSSESSION",
      "La possession décrit la part du temps ou des séquences pendant lesquelles une équipe contrôle le ballon. Une forte possession ne garantit pas la victoire : elle doit être mise en regard des occasions, tirs, buts et contexte du score.",
      "",
      "Awena ne doit afficher une possession chiffrée que si elle est réellement mesurée ou enregistrée par le match.",
    ),
  },

  // ---------------------------------------------------------------------------
  // BABY-FOOT / TABLE SOCCER
  // ---------------------------------------------------------------------------
  {
    id: "babyfoot-official-v-house", domain: "babyfoot", title: "Baby-foot · règles officielles et règles maison",
    aliases: ["regles officielles baby foot", "regles maison babyfoot", "itsf baby foot", "reglement table soccer"],
    text: md(
      "## DEUX MONDES DE RÈGLES",
      "Le baby-foot possède des règlements sportifs internationaux, notamment ceux de l'**ITSF**, mais aussi énormément de règles de café / maison : pissette, gamelle, demi, râteau, pêche, bonus ou interdictions.",
      "",
      "MULTISPORTS SCORING assume cette diversité : la configuration de la partie indique quelles règles spéciales sont actives et quel effet elles produisent.",
    ),
    source: "International Table Soccer Federation — Official Rules",
  },
  {
    id: "babyfoot-positions", domain: "babyfoot", title: "Baby-foot · barres et rôles",
    aliases: ["barres baby foot", "gardien defense milieu attaque babyfoot", "positions joueurs baby foot", "roles babyfoot 2v2"],
    text: md(
      "## RÔLES SUR LA TABLE",
      "Selon la table, on distingue les zones de **gardien**, **défense**, **milieu** et **attaque**. En 2V2, les partenaires peuvent se répartir défense et attaque, avec des changements autorisés selon les règles du match.",
      "",
      "L'application peut attribuer les buts à une zone ou un rôle afin d'analyser d'où vient l'efficacité offensive.",
    ),
  },
  {
    id: "babyfoot-pissette", domain: "babyfoot", title: "Baby-foot · pissette",
    aliases: ["pissette baby foot", "but pissette", "regle pissette babyfoot"],
    text: md(
      "## PISSETTE",
      "La **pissette** est une appellation de règle populaire française dont la définition et la sanction varient selon les habitudes locales et le type de table.",
      "",
      "Dans MULTISPORTS SCORING, Awena ne doit donc jamais inventer une sanction universelle : elle doit lire le réglage actif — autorisée, refusée, statistique seulement, bonus, malus, etc.",
    ),
  },
  {
    id: "babyfoot-gamelle", domain: "babyfoot", title: "Baby-foot · gamelle",
    aliases: ["gamelle baby foot", "but gamelle babyfoot", "regle gamelle"],
    text: md(
      "## GAMELLE",
      "La **gamelle** désigne couramment une situation où le ballon entre dans le but puis ressort. Selon les règles maison, elle peut compter normalement, donner un bonus ou avoir un traitement spécial.",
      "",
      "L'effet dans l'application dépend du preset Baby-foot sélectionné.",
    ),
  },
  {
    id: "babyfoot-demi", domain: "babyfoot", title: "Baby-foot · demi",
    aliases: ["demi baby foot", "but des demis", "regle demi babyfoot", "barre des demis"],
    text: md(
      "## DEMI",
      "Le terme **Demi** renvoie aux buts ou actions réalisés depuis la barre du milieu dans certains règlements maison. Leur validité et leur valeur ne sont pas universelles.",
      "",
      "MULTISPORTS SCORING les suit séparément parce que l'utilisateur peut choisir de les autoriser, les neutraliser ou leur appliquer un bonus/malus.",
    ),
  },
  {
    id: "babyfoot-peche", domain: "babyfoot", title: "Baby-foot · pêche",
    aliases: ["peche baby foot", "peche offensive babyfoot", "peche defensive babyfoot", "recuperer balle but babyfoot"],
    text: md(
      "## PÊCHE",
      "La **pêche** est une règle / action de baby-foot de tradition locale liée à la récupération rapide du ballon dans certaines situations de but ou de défense. Les conventions diffèrent beaucoup d'un groupe à l'autre.",
      "",
      "L'application distingue **pêche offensive** et **pêche défensive** lorsqu'elles sont enregistrées ; leur effet dépend du paramétrage choisi.",
    ),
  },
  {
    id: "babyfoot-rake", domain: "babyfoot", title: "Baby-foot · râteau",
    aliases: ["rateau baby foot", "râteau babyfoot", "regle rateau", "rake foosball"],
    text: md(
      "## RÂTEAU",
      "Le **râteau** est une notion de règles maison dont l'interprétation varie. Comme pour Pissette, Demi ou Gamelle, Awena doit annoncer la règle réellement configurée au lieu de présenter une coutume locale comme une loi universelle.",
    ),
  },
  {
    id: "babyfoot-stat-reading", domain: "babyfoot", title: "Baby-foot · lecture des statistiques",
    aliases: ["stats baby foot", "analyser babyfoot", "buts avant defense gardien milieu", "difference buts babyfoot"],
    text: md(
      "## LIRE LES STATS BABY-FOOT",
      "Combine **victoires, buts pour/contre, différence de buts, clean sheets** et provenance des buts. Les événements spéciaux (Demi, Gamelle, Pissette, Pêche) donnent une lecture plus fine du style de jeu lorsque ces règles étaient actives.",
      "",
      "Compare de préférence des matchs joués avec des formats et presets proches.",
    ),
  },

  // ---------------------------------------------------------------------------
  // DÉS — probabilités et modes de jeu
  // ---------------------------------------------------------------------------
  {
    id: "dice-d6", domain: "dice", title: "Dés · probabilités d'un D6",
    aliases: ["probabilite de 1 sur un de", "d6 probabilite", "chance de faire un 6", "faces de classique"],
    text: md(
      "## D6 ÉQUILIBRÉ",
      "Sur un dé classique à 6 faces équilibré, chaque face a une probabilité de **1/6 ≈ 16,67 %** à chaque lancer.",
      "",
      "Les lancers indépendants n'ont pas de mémoire : après cinq lancers sans 6, la chance d'obtenir 6 au lancer suivant reste 1/6.",
    ),
  },
  {
    id: "dice-two-dice-sum", domain: "dice", title: "Dés · somme de deux D6",
    aliases: ["probabilite somme deux des", "faire 7 deux des", "2d6 probabilite", "somme 2d6"],
    text: md(
      "## SOMME DE DEUX D6",
      "Avec deux dés à six faces, les sommes ne sont **pas équiprobables**. Il existe 36 couples possibles :",
      "- **7** est la somme la plus fréquente : 6 combinaisons, soit **1/6** ;",
      "- **2** et **12** n'ont qu'une combinaison chacune : **1/36**.",
      "",
      "Cette distribution est utile pour comprendre les modes où la somme des dés fait avancer le score.",
    ),
  },
  {
    id: "dice-independence", domain: "dice", title: "Dés · indépendance des lancers",
    aliases: ["les des ont ils une memoire", "serie de 6 probabilite", "gambler fallacy des", "independance lancers"],
    text: md(
      "## INDÉPENDANCE",
      "Avec des dés équilibrés et des lancers indépendants, les résultats précédents ne modifient pas la probabilité du prochain lancer. Une longue série inhabituelle ne rend pas le résultat opposé 'dû'.",
      "",
      "Awena peut utiliser cette notion pour expliquer une série, mais pas pour prédire le prochain lancer.",
    ),
  },
  {
    id: "dice-farkle-risk", domain: "dice", title: "Farkle · bank ou continuer",
    aliases: ["strategie farkle", "bank farkle", "continuer ou banker farkle", "bust farkle"],
    text: md(
      "## FARKLE — GESTION DU RISQUE",
      "Farkle est un jeu de **push-your-luck** : conserver les dés qui scorent puis choisir entre **Bank** (sécuriser les points) ou relancer pour augmenter le tour au risque d'un **Bust**.",
      "",
      "Plus le total temporaire est élevé, plus le coût potentiel d'un Bust augmente. La bonne décision dépend aussi du score adverse et de la proximité de la cible.",
      "",
      "> Les combinaisons et seuils exacts peuvent varier ; l'application doit appliquer sa variante configurée.",
    ),
  },
  {
    id: "dice-hot-dice", domain: "dice", title: "Farkle · Hot Dice",
    aliases: ["hot dice farkle", "des chauds farkle", "tous les des scorent farkle"],
    text: md(
      "## HOT DICE",
      "Dans de nombreuses variantes de Farkle, lorsque **tous les dés ont été utilisés dans des combinaisons marquantes**, le joueur peut reprendre l'ensemble des dés et continuer le même tour : ce sont les Hot Dice.",
      "",
      "Le code de MULTISPORTS SCORING signale encore certaines options Farkle comme à finaliser : Awena doit préciser le statut de l'option active.",
    ),
  },
  {
    id: "dice-poker-hands", domain: "dice", title: "Poker Dice · combinaisons",
    aliases: ["combinaisons poker dice", "brelan carre full poker des", "main poker dice", "classement poker des"],
    text: md(
      "## COMBINAISONS DE POKER AUX DÉS",
      "Les variantes de Poker Dice classent généralement des familles comme **paire, deux paires, brelan, suite, full, carré, poker / cinq identiques**, mais l'ordre exact et la présence de chaque combinaison dépendent de la règle utilisée.",
      "",
      "Awena doit utiliser le barème du mode de l'application plutôt qu'imposer un classement externe s'il diffère.",
    ),
  },
  {
    id: "dice-yam-categories", domain: "dice", title: "YAM · catégories",
    aliases: ["categories yam", "yams combinaisons", "yahtzee yam", "full petite suite grande suite yam"],
    text: md(
      "## YAM / YAMS — PRINCIPE",
      "Les jeux de type YAM utilisent plusieurs lancers pour construire une combinaison et remplir une grille de catégories : valeurs faciales, brelan/carré, full, suites, chance, YAM selon le règlement choisi.",
      "",
      "Les barèmes varient entre YAM, Yams et Yahtzee : dans l'application, la grille réellement affichée est la référence à suivre.",
    ),
  },
  {
    id: "dice-421", domain: "dice", title: "421 · combinaison emblématique",
    aliases: ["421 des regle", "quatre deux un des", "combinaison 421", "jeu 421"],
    text: md(
      "## 421",
      "Le **421** est une famille de jeux de dés centrée sur des combinaisons de trois dés, dont 4-2-1 est généralement la combinaison emblématique. Les hiérarchies, manches et jetons varient beaucoup selon les traditions.",
      "",
      "Pour MULTISPORTS SCORING, Awena doit donc décrire précisément la variante programmée et signaler toute mécanique encore placeholder.",
    ),
  },

  // ---------------------------------------------------------------------------
  // STATISTIQUES — culture de la donnée applicable à tous les sports
  // ---------------------------------------------------------------------------
  {
    id: "stats-win-rate", domain: "stats", title: "Statistiques · Win Rate",
    aliases: ["win rate", "taux de victoire", "pourcentage victoires", "calcul winrate"],
    text: md(
      "## WIN RATE",
      "Le **taux de victoire** se calcule généralement par `victoires ÷ matchs pris en compte × 100`.",
      "",
      "Attention au dénominateur : si un sport accepte les nuls, il faut décider si tous les matchs sont inclus — c'est généralement le choix le plus lisible — plutôt que de retirer artificiellement les nuls.",
    ),
  },
  {
    id: "stats-sample-size", domain: "stats", title: "Statistiques · taille d'échantillon",
    aliases: ["taille echantillon stats", "pas assez de matchs", "stat fiable combien de matchs", "10 matchs suffisent"],
    text: md(
      "## TAILLE D'ÉCHANTILLON",
      "Une statistique sur **2 ou 3 matchs** peut être très volatile. Plus le nombre de parties augmente, plus une moyenne ou un win rate devient représentatif du niveau habituel.",
      "",
      "Awena devrait toujours contextualiser un record ou un pourcentage avec le **nombre de matchs / manches / tentatives** qui le soutient lorsque cette donnée existe.",
    ),
  },
  {
    id: "stats-weighted-average", domain: "stats", title: "Statistiques · moyenne pondérée",
    aliases: ["moyenne ponderee", "moyenne des moyennes fausse", "calcul moyenne plusieurs matchs", "weighted average"],
    text: md(
      "## MOYENNE PONDÉRÉE",
      "Quand les matchs n'ont pas tous la même durée, faire la simple moyenne de leurs moyennes peut être trompeur.",
      "",
      "Exemple X01 : la moyenne globale la plus juste est `total des points scorés ÷ total des fléchettes × 3`, et non la moyenne arithmétique de chaque AVG3D si les parties ont des nombres de fléchettes différents.",
    ),
  },
  {
    id: "stats-median", domain: "stats", title: "Statistiques · médiane",
    aliases: ["mediane stats", "difference moyenne mediane", "median", "valeur typique stats"],
    text: md(
      "## MÉDIANE",
      "La **médiane** est la valeur centrale lorsque les résultats sont triés. Elle résiste mieux aux performances extrêmes que la moyenne.",
      "",
      "Si un joueur réalise neuf matchs autour de 50 puis un match à 100, la moyenne monte fortement alors que la médiane décrit mieux son niveau le plus courant.",
    ),
  },
  {
    id: "stats-streak", domain: "stats", title: "Statistiques · série",
    aliases: ["winning streak", "serie victoires", "streak", "plus longue serie"],
    text: md(
      "## STREAK / SÉRIE",
      "Une **winning streak** est une suite de victoires consécutives sans interruption selon l'ordre chronologique des matchs retenus. Une série peut être globale ou filtrée par sport/mode.",
      "",
      "Il faut préciser le périmètre : une série X01 n'est pas nécessairement la même chose qu'une série toutes disciplines confondues.",
    ),
  },
  {
    id: "stats-head-to-head", domain: "stats", title: "Statistiques · Head-to-Head",
    aliases: ["head to head", "h2h", "face a face joueurs", "duels entre deux joueurs"],
    text: md(
      "## HEAD-TO-HEAD",
      "Le **H2H** isole les confrontations où les mêmes adversaires se sont rencontrés. C'est souvent plus informatif qu'un classement global pour répondre à : « qui gagne le plus souvent entre A et B ? ».",
      "",
      "Le filtre doit éviter de mélanger des sports ou formats incomparables sauf si l'utilisateur le demande explicitement.",
    ),
  },
  {
    id: "stats-difference", domain: "stats", title: "Statistiques · différence",
    aliases: ["difference points", "goal difference", "difference buts", "points pour contre"],
    text: md(
      "## DIFFÉRENCE",
      "Une différence se calcule généralement par **Pour − Contre** : buts pour moins buts contre, points marqués moins points encaissés, etc.",
      "",
      "Elle complète le nombre de victoires : deux joueurs au même bilan peuvent avoir dominé leurs matchs avec des marges très différentes.",
    ),
  },
  {
    id: "stats-rate-v-count", domain: "stats", title: "Statistiques · taux vs volume",
    aliases: ["taux vs nombre", "pourcentage ou volume stats", "rate count stats", "10 sur 20 mieux que 2 sur 3"],
    text: md(
      "## TAUX ET VOLUME",
      "Un **taux** décrit l'efficacité ; un **volume** décrit la quantité. 2 réussites sur 3 donnent 66,7 %, mais sur un très petit échantillon. 60 sur 100 donnent 60 %, avec beaucoup plus d'observations.",
      "",
      "Pour comparer des joueurs, Awena devrait idéalement afficher les deux : **pourcentage + nombre de tentatives**.",
    ),
  },
  {
    id: "stats-record-context", domain: "stats", title: "Statistiques · contexte d'un record",
    aliases: ["record stats contexte", "meilleur score record fiable", "record par mode", "record toutes parties"],
    text: md(
      "## UN RECORD DOIT AVOIR UN PÉRIMÈTRE",
      "Un record n'est utile que si l'on connaît son **sport, mode, variante, période et unité**. Une moyenne X01 ne doit pas être comparée directement à un score de Cricket ou à une performance d'entraînement.",
      "",
      "Awena doit conserver le filtre demandé et annoncer clairement quand elle élargit la recherche.",
    ),
  },
  {
    id: "stats-correlation", domain: "stats", title: "Statistiques · corrélation",
    aliases: ["correlation stats", "correlation ne veut pas dire causalite", "cause stats", "deux stats evoluent ensemble"],
    text: md(
      "## CORRÉLATION ≠ CAUSALITÉ",
      "Deux indicateurs peuvent évoluer ensemble sans que l'un cause l'autre. Par exemple, un meilleur win rate peut coïncider avec une meilleure moyenne, mais le format des adversaires ou la difficulté des matchs peut aussi intervenir.",
      "",
      "Awena peut signaler une association observée, mais ne doit pas inventer une cause sans donnée suffisante.",
    ),
  },
  {
    id: "stats-recent-form", domain: "stats", title: "Statistiques · forme récente",
    aliases: ["forme recente", "recent form", "derniers matchs", "niveau actuel vs global"],
    text: md(
      "## FORME RÉCENTE",
      "La **forme récente** se concentre sur une fenêtre courte — par exemple les 5, 10 ou 20 derniers matchs — tandis que la carrière globale lisse les variations sur une période beaucoup plus longue.",
      "",
      "Les deux vues répondent à des questions différentes : « qui est le meilleur historiquement ? » et « qui joue le mieux en ce moment ? ».",
    ),
  },

  // ---------------------------------------------------------------------------
  // COMPÉTITIONS ET FORMATS
  // ---------------------------------------------------------------------------
  {
    id: "competition-bestof", domain: "competition", title: "Compétition · Best Of",
    aliases: ["best of 3", "best of 5", "bo3 bo5", "combien gagner best of", "best of signifie"],
    text: md(
      "## BEST OF",
      "Un **Best Of N** est gagné dès qu'un participant obtient plus de la moitié des unités possibles.",
      "",
      "- BO1 → 1 victoire ;",
      "- BO3 → 2 victoires ;",
      "- BO5 → 3 victoires ;",
      "- BO7 → 4 victoires.",
      "",
      "L'unité peut être un set, un leg ou une manche selon le sport.",
    ),
  },
  {
    id: "competition-roundrobin", domain: "competition", title: "Compétition · round-robin",
    aliases: ["round robin", "toutes rondes", "chacun contre chacun", "poule championnat"],
    text: md(
      "## ROUND-ROBIN / TOUTES RONDES",
      "Dans un round-robin, chaque participant ou équipe rencontre les autres membres de son groupe selon le calendrier prévu. Le classement final utilise ensuite victoires, points, différence ou tie-breaks définis par la compétition.",
      "",
      "Ce format donne plus de matchs et réduit le poids d'une seule contre-performance par rapport à l'élimination directe.",
    ),
  },
  {
    id: "competition-knockout", domain: "competition", title: "Compétition · élimination directe",
    aliases: ["elimination directe", "knockout tournoi", "tableau tournoi", "perdant elimine"],
    text: md(
      "## ÉLIMINATION DIRECTE",
      "Dans un tableau à élimination directe, le vainqueur avance et le perdant quitte le tableau principal. Les tours peuvent être 1/8, quarts, demi-finales puis finale selon le nombre de participants.",
      "",
      "Des byes peuvent être nécessaires si le nombre d'inscrits n'est pas une puissance de deux.",
    ),
  },
  {
    id: "competition-bye", domain: "competition", title: "Compétition · bye",
    aliases: ["bye tournoi", "exempt premier tour", "pourquoi joueur sans match tournoi", "tour exempt"],
    text: md(
      "## BYE / EXEMPTION",
      "Un **bye** qualifie automatiquement un participant pour le tour suivant lorsqu'un tableau n'a pas le nombre exact de joueurs nécessaire pour remplir toutes les affiches.",
      "",
      "Un bye n'est pas une victoire sportive jouée : son traitement statistique doit rester distinct si l'application calcule des win rates.",
    ),
  },
  {
    id: "competition-seeding", domain: "competition", title: "Compétition · têtes de série",
    aliases: ["tete de serie", "seeding tournoi", "seed tournoi", "pourquoi meilleurs se rencontrent pas debut"],
    text: md(
      "## TÊTES DE SÉRIE",
      "Le **seeding** répartit les participants les mieux classés dans différentes zones du tableau pour éviter qu'ils ne se rencontrent tous dès les premiers tours.",
      "",
      "Le tirage peut ensuite être totalement aléatoire pour les autres participants ou suivre d'autres règles.",
    ),
  },
  {
    id: "competition-tiebreak", domain: "competition", title: "Compétition · tie-break",
    aliases: ["tie break classement", "egalite classement tournoi", "departager equipes", "tiebreak"],
    text: md(
      "## TIE-BREAK",
      "Un **tie-break** est un critère utilisé pour départager des participants à égalité : confrontation directe, différence, points marqués, sets/legs, etc.",
      "",
      "Il n'existe pas un tie-break universel : Awena doit consulter les règles du tournoi ou les paramètres de la compétition suivie.",
    ),
  },

  // ---------------------------------------------------------------------------
  // APPLICATION — concepts d'usage et bonnes pratiques
  // ---------------------------------------------------------------------------
  {
    id: "app-rule-priority", domain: "app", title: "Application · priorité des règles",
    aliases: ["regle officielle ou application", "quelle regle suivre", "variante app vs regle officielle", "awena se trompe de regle"],
    text: md(
      "## PRIORITÉ DES RÈGLES",
      "Awena distingue trois niveaux :",
      "1. **règle de référence du sport** ;",
      "2. **variante choisie dans MULTISPORTS SCORING** ;",
      "3. **état réel de la partie en cours**.",
      "",
      "Pour expliquer la partie actuellement jouée, la configuration active est prioritaire. La règle officielle sert de référence culturelle et de comparaison, pas à écraser un preset volontairement différent.",
    ),
  },
  {
    id: "app-history-source-truth", domain: "app", title: "Application · historique comme source",
    aliases: ["historique source de verite", "d ou viennent stats awena", "stats reconstruites historique", "awena lit historique"],
    text: md(
      "## HISTORIQUE = SOURCE DE VÉRITÉ STATISTIQUE",
      "Pour les records et agrégations, Awena doit partir des **parties réellement enregistrées**. Elle peut calculer un résumé à partir de l'Historique, mais ne doit pas fabriquer des événements qui n'ont jamais été sauvegardés.",
      "",
      "Une ancienne partie qui ne contient pas une métrique détaillée ne permet pas toujours de la reconstruire rétroactivement.",
    ),
  },
  {
    id: "app-profile-active-player", domain: "app", title: "Application · profil actif vs joueur actif",
    aliases: ["profil actif joueur actif", "difference profil actif et joueur partie", "mon profil joueur selectionne"],
    text: md(
      "## DEUX NOTIONS DIFFÉRENTES",
      "Le **profil actif de l'application** représente l'utilisateur / profil principal actuellement sélectionné. Le **joueur actif d'une partie** est celui dont c'est le tour dans le match.",
      "",
      "Ils peuvent être différents, notamment dans une partie locale multijoueur où plusieurs profils participent sur le même appareil.",
    ),
  },
  {
    id: "app-bot-v-human", domain: "app", title: "Application · bot IA vs profil humain",
    aliases: ["bot ia ou joueur humain", "difference bot profil", "stats bot ia", "jouer contre bot"],
    text: md(
      "## BOT IA",
      "Un bot est un adversaire simulé par l'application. Il peut avoir une identité, un niveau et un comportement de jeu, mais ce n'est pas un profil humain réel.",
      "",
      "Pour les classements, il est utile de pouvoir distinguer performances contre bots et performances contre humains si le filtre statistique le permet.",
    ),
  },
  {
    id: "app-backup-v-sync", domain: "app", title: "Application · sauvegarde vs synchronisation",
    aliases: ["difference sauvegarde synchronisation", "backup vs sync", "sauvegarde n est pas synchro", "restore sync"],
    text: md(
      "## SAUVEGARDE ≠ SYNCHRONISATION",
      "Une **sauvegarde** crée un état récupérable à un instant donné. Une **synchronisation** cherche à maintenir plusieurs emplacements cohérents au fil des changements.",
      "",
      "Une mauvaise synchronisation peut propager une suppression ; une sauvegarde indépendante permet justement de revenir à un état antérieur.",
    ),
  },
  {
    id: "app-backup-before-restore", domain: "app", title: "Application · sécurité avant restauration",
    aliases: ["avant restauration sauvegarde", "restore risque donnees", "restaurer ecrase donnees", "backup avant import"],
    text: md(
      "## AVANT UNE RESTAURATION IMPORTANTE",
      "Si les données locales actuelles comptent, crée une **sauvegarde de sécurité** avant d'importer ou restaurer un snapshot susceptible de remplacer l'état local.",
      "",
      "Vérifie aussi la date, la source et le périmètre de la sauvegarde afin d'éviter de restaurer accidentellement un état plus ancien que prévu.",
    ),
  },
  {
    id: "app-stat-filter", domain: "app", title: "Application · filtres statistiques",
    aliases: ["filtrer stats par mode", "stats toutes disciplines", "filtre periode joueur mode", "pourquoi stats differentes"],
    text: md(
      "## FILTRER AVANT DE COMPARER",
      "Une statistique peut changer selon le **sport, mode, joueur, équipe, adversaire, période ou format** sélectionné. Deux écrans ne montrent pas forcément la même population de matchs.",
      "",
      "Avant de conclure à une incohérence, compare les filtres et le nombre de parties pris en compte.",
    ),
  },
  {
    id: "app-local-first", domain: "app", title: "Application · données locales",
    aliases: ["donnees locales application", "hors ligne multisports scoring", "local first", "donnees sur telephone"],
    text: md(
      "## DONNÉES LOCALES",
      "Une partie importante de MULTISPORTS SCORING fonctionne avec des données conservées localement afin d'offrir réactivité et usage même sans connexion pour les fonctions compatibles.",
      "",
      "Les fonctions Online, cloud, publicité ou synchronisation peuvent naturellement nécessiter le réseau. Une donnée uniquement locale doit être sauvegardée avant désinstallation ou changement d'appareil si l'utilisateur veut la conserver.",
    ),
  },
  {
    id: "app-theme-data", domain: "app", title: "Application · thème et données",
    aliases: ["changer theme efface donnees", "theme influence stats", "apparence application donnees", "theme premium"],
    text: md(
      "## THÈME = PRÉSENTATION",
      "Changer de thème modifie l'apparence de l'interface et, pour certains packs, les textures ou ambiances visuelles. Cela ne doit pas modifier les résultats sportifs déjà enregistrés.",
      "",
      "Les préférences visuelles et les données de matchs sont des préoccupations distinctes.",
    ),
  },
  {
    id: "app-language-knowledge", domain: "app", title: "Application · langue d'Awena",
    aliases: ["awena connait langues", "traduction awena", "awena anglais espagnol allemand", "langue awena"],
    text: md(
      "## LANGUE ET CONNAISSANCE",
      "La base de connaissances d'Awena reste structurée autour de concepts internes stables. Sur Android, les questions/réponses peuvent être traduites localement pour suivre la langue choisie dans l'application.",
      "",
      "Le sens de la règle doit rester identique après traduction : les noms propres de modes, scores et notations comme T20, D16 ou DBULL ne doivent pas être altérés.",
    ),
  },
  {
    id: "app-offline-awena", domain: "app", title: "Application · Awena locale",
    aliases: ["awena fonctionne hors ligne", "awena locale", "assistant sans internet", "base locale awena"],
    text: md(
      "## AWENA EST D'ABORD UNE ASSISTANTE LOCALE",
      "Ses réponses sur les modes, l'application, l'écran courant et l'Historique doivent rester disponibles sans dépendre d'une recherche Internet permanente lorsque les composants locaux nécessaires sont installés.",
      "",
      "Cela permet des réponses rapides et cohérentes avec la version réellement installée de l'application.",
    ),
  },
];

function scoreEntry(entry: ExpertEntry, question: string, rememberedTopic?: string, context?: AwenaRuntimeContext) {
  const q = norm(question);
  const qTokens = new Set(tokens(q));
  let score = 0;

  for (const aliasRaw of entry.aliases) {
    const alias = norm(aliasRaw);
    if (!alias) continue;
    if (q === alias) score += 24;
    else if (alias.length >= 4 && q.includes(alias)) score += 12;

    const aliasTokens = tokens(alias);
    let matched = 0;
    for (const token of aliasTokens) {
      if (qTokens.has(token)) {
        matched += 1;
        score += token.length >= 5 ? 2.5 : 1.5;
      }
    }
    if (aliasTokens.length >= 2 && matched === aliasTokens.length) score += 5;
  }

  if (rememberedTopic === `expert:${entry.id}`) score += 6;

  const sport = norm(context?.sport || "");
  const route = norm(context?.route || "");
  if (entry.domain === "darts" && (sport.includes("dart") || route.includes("x01") || route.includes("cricket") || route.includes("darts"))) score += 1.5;
  if (entry.domain === "petanque" && (sport.includes("petanque") || route.includes("petanque"))) score += 1.5;
  if (entry.domain === "pingpong" && (sport.includes("ping") || route.includes("pingpong"))) score += 1.5;
  if (entry.domain === "molkky" && (sport.includes("molk") || route.includes("molkky"))) score += 1.5;
  if (entry.domain === "football" && (sport.includes("foot") || route.startsWith("foot"))) score += 1.5;
  if (entry.domain === "babyfoot" && (sport.includes("baby") || route.includes("babyfoot"))) score += 1.5;
  if (entry.domain === "dice" && (sport.includes("dice") || route.includes("dice"))) score += 1.5;

  return score;
}

export function answerAwenaExpertReference(
  question: string,
  context: AwenaRuntimeContext,
  rememberedTopic?: string,
): AwenaReply | null {
  const q = norm(question);
  if (!q) return null;

  let best: { entry: ExpertEntry; score: number } | null = null;
  for (const entry of ENTRIES) {
    const score = scoreEntry(entry, q, rememberedTopic, context);
    if (!best || score > best.score) best = { entry, score };
  }

  // This layer is intentionally strict: it should enrich precise questions,
  // not hijack generic navigation / configuration requests handled elsewhere.
  if (!best || best.score < 8) return null;

  const source = best.entry.source ? `\n\n> **Référence générale :** ${best.entry.source}. La configuration de MULTISPORTS SCORING reste prioritaire pour la partie en cours.` : "";
  return {
    text: `${best.entry.text}${source}`,
    modeId: context.mode || null,
    knowledgeTopic: `expert:${best.entry.id}`,
  };
}

export function awenaExpertReferenceCount() { return ENTRIES.length; }

export function awenaExpertReferenceDomains() {
  return [...new Set(ENTRIES.map((entry) => entry.domain))];
}
