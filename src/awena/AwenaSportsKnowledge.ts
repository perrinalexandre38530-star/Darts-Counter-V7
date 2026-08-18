import type { AwenaAction, AwenaReply, AwenaRuntimeContext } from "./awena.types";

type SportsEntry = {
  id: string;
  sport: "petanque" | "pingpong" | "babyfoot" | "molkky" | "dice" | "football";
  title: string;
  aliases: string[];
  text: string;
  route?: string;
  related?: Array<{ label: string; prompt: string }>;
};

function norm(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[_/\\-]+/g, " ")
    .replace(/[^a-z0-9+\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function actions(entry: SportsEntry): AwenaAction[] | undefined {
  const list: AwenaAction[] = [];
  if (entry.route) list.push({ id: `sport-${entry.id}`, label: `Ouvrir ${entry.title}`, kind: "navigate", route: entry.route });
  for (const item of entry.related || []) {
    list.push({ id: `sport-${entry.id}-${list.length}`, label: item.label, kind: "ask", prompt: item.prompt });
  }
  return list.length ? list.slice(0, 4) : undefined;
}

const ENTRIES: SportsEntry[] = [
  {
    id: "petanque-simple",
    sport: "petanque",
    title: "Pétanque · Match simple",
    aliases: ["petanque match simple", "petanque 1v1", "simple petanque", "tete a tete petanque"],
    route: "petanque_config",
    text: `## PÉTANQUE — MATCH SIMPLE
**2 joueurs**, un contre un.

## RÈGLES
- chaque joueur dispose de **3 boules par mène** ;
- à la fin de la mène, seul le camp le mieux placé marque ;
- le maximum est donc **3 points par mène** ;
- la partie standard se gagne en atteignant **13 points**.

## CONFIGURATION
Sélectionne exactement **2 joueurs**, puis vérifie le score cible, l'ordre de départ et les options de mesure proposées par l'écran.

> Après une mène, le camp qui a marqué démarre normalement la mène suivante.`,
  },
  {
    id: "petanque-ffa3",
    sport: "petanque",
    title: "Pétanque · Match à 3",
    aliases: ["petanque match a 3", "petanque trois joueurs", "petanque chacun pour soi", "ffa3 petanque"],
    route: "petanque_config",
    text: `## PÉTANQUE — MATCH À 3
**3 joueurs indépendants**, sans équipe.

## RÈGLES
- chacun joue **3 boules** par mène ;
- le joueur ayant la boule la mieux placée remporte la mène ;
- il marque selon les boules mieux placées que celles de ses adversaires ;
- le maximum prévu par ce format est **3 points par mène**.

## CONFIGURATION
Sélectionne exactement **3 profils**. Ce mode ne doit pas être confondu avec la triplette, qui oppose deux équipes de trois.`,
  },
  {
    id: "petanque-doublette",
    sport: "petanque",
    title: "Pétanque · Doublette",
    aliases: ["doublette", "petanque 2v2", "petanque deux contre deux"],
    route: "petanque_config",
    text: `## DOUBLETTE
Deux équipes de **2 joueurs**.

## RÈGLES
- standard : **3 boules par joueur** ;
- chaque équipe dispose donc de **6 boules** ;
- le score est commun à l'équipe ;
- jusqu'à **6 points** peuvent être marqués sur une mène ;
- victoire standard à **13 points**.

## CONFIGURATION
Choisis les quatre joueurs ou les équipes enregistrées, puis vérifie l'ordre de départ, les rôles et les options de partie.`,
  },
  {
    id: "petanque-triplette",
    sport: "petanque",
    title: "Pétanque · Triplette",
    aliases: ["triplette", "petanque 3v3", "petanque trois contre trois"],
    route: "petanque_config",
    text: `## TRIPLETTE
Deux équipes de **3 joueurs**.

## RÈGLES
- format officiel courant : **2 boules par joueur** ;
- chaque équipe dispose donc de **6 boules** ;
- le score est commun au camp ;
- victoire standard à **13 points**.

## DÉROULÉ
La rotation des joueurs se poursuit jusqu'à ce que toutes les boules soient jouées, puis la mène est comptée.`,
  },
  {
    id: "petanque-quadrette",
    sport: "petanque",
    title: "Pétanque · Quadrette",
    aliases: ["quadrette", "petanque 4v4", "petanque quatre contre quatre"],
    route: "petanque_config",
    text: `## QUADRETTE
Deux équipes de **4 joueurs**.

## CONFIGURATION DU MODE
L'application prévoit typiquement **2 boules par joueur**, soit **8 boules par équipe**.

## SCORE
Le score est commun à l'équipe et le format peut produire des mènes plus longues. Vérifie le score cible et les options proposées avant de lancer.`,
  },
  {
    id: "petanque-variants",
    sport: "petanque",
    title: "Pétanque · Variantes",
    aliases: ["variantes petanque", "petanque 1v2", "petanque 2v3", "petanque 3v4", "handicap petanque"],
    route: "petanque_config",
    text: `## VARIANTES / HANDICAP
L'application accepte des équipes **déséquilibrées** : par exemple **1 contre 2, 2 contre 3 ou 3 contre 4**.

## ÉQUILIBRAGE
La configuration peut compenser le nombre de joueurs en ajustant le nombre de boules par joueur / camp.

## À VÉRIFIER
- composition exacte des camps ;
- nombre de boules ;
- score cible ;
- ordre de départ ;
- éventuelles options de handicap.`,
  },
  {
    id: "petanque-training",
    sport: "petanque",
    title: "Pétanque · Training",
    aliases: ["training petanque", "entrainement petanque", "exercice petanque"],
    route: "petanque_config",
    text: `## TRAINING PÉTANQUE
Le Training sert aux **exercices et mesures** plutôt qu'à une partie classique à 13.

## UTILISATION
- travail du pointage ;
- travail du tir ;
- séries de précision ;
- saisie et suivi des performances lorsque l'exercice le permet.

> Il n'y a pas nécessairement une condition de victoire classique : l'objectif est la progression mesurée.`,
  },
  {
    id: "petanque-tournament",
    sport: "petanque",
    title: "Pétanque · Tournoi",
    aliases: ["tournoi petanque", "competition petanque", "poules petanque", "elimination petanque"],
    route: "petanque_tournaments",
    text: `## TOURNOI PÉTANQUE
Le module enchaîne plusieurs matchs et gère la structure de compétition.

## FORMATS PRÉVUS
- **poules / round-robin** ;
- **élimination directe** selon la configuration ;
- suivi des matchs et du classement final.

## FLUX
Création → participants / équipes → format → matchs → résultats → classement.`,
  },

  {
    id: "pingpong-1v1",
    sport: "pingpong",
    title: "Ping-Pong · 1V1",
    aliases: ["ping pong 1v1", "pingpong 1v1", "tennis de table 1v1"],
    route: "pingpong_config",
    text: `## PING-PONG — 1V1
Match classique entre **2 joueurs**.

## CONFIGURATION
L'écran permet de choisir les joueurs puis les paramètres du match, notamment le format de sets et les règles de service proposées.

## SERVICE
La configuration prévoit plusieurs logiques de service, dont le fonctionnement officiel, une alternance réglée, ou des variantes où le vainqueur sert.`,
  },
  {
    id: "pingpong-2v2",
    sport: "pingpong",
    title: "Ping-Pong · 2V2",
    aliases: ["ping pong 2v2", "pingpong double", "tennis de table double"],
    route: "pingpong_config",
    text: `## PING-PONG — 2V2
Match en **double**, deux joueurs contre deux.

## CONFIGURATION
Sélectionne les quatre joueurs et leur répartition en équipes. Les paramètres de sets et de service sont ensuite appliqués au match.`,
  },
  {
    id: "pingpong-2v1",
    sport: "pingpong",
    title: "Ping-Pong · 2V1",
    aliases: ["ping pong 2v1", "pingpong 2 contre 1", "tennis de table 2v1"],
    route: "pingpong_config",
    text: `## PING-PONG — 2V1
Format asymétrique : **deux joueurs contre un**.

## CONFIGURATION
Choisis les trois participants, compose le camp à deux et le joueur solo, puis règle les sets et le service comme proposé par l'écran.`,
  },
  {
    id: "pingpong-tournante",
    sport: "pingpong",
    title: "Ping-Pong · Tournante",
    aliases: ["tournante ping pong", "tournante pingpong", "rotation ping pong"],
    route: "pingpong_config",
    text: `## TOURNANTE
Les joueurs tournent autour de la table avec une logique de **rotation et d'élimination progressive**.

## OBJECTIF
Rester en jeu plus longtemps que les autres. Les détails exacts de rotation et d'élimination sont ceux affichés par la configuration du mode.`,
  },
  {
    id: "pingpong-training",
    sport: "pingpong",
    title: "Ping-Pong · Training",
    aliases: ["training ping pong", "entrainement pingpong", "training tennis de table"],
    route: "pingpong_training",
    text: `## TRAINING PING-PONG
Espace d'entraînement destiné aux **objectifs, séries et statistiques** plutôt qu'à un match standard.

> Utilise les objectifs affichés sur l'écran Training pour suivre la progression.`,
  },

  {
    id: "molkky-classic",
    sport: "molkky",
    title: "Mölkky · Classique",
    aliases: ["molkky classique", "regles molkky", "comment jouer molkky"],
    route: "molkky_config",
    text: `## MÖLKKY — CLASSIQUE
## SCORE
- **1 quille tombée** : tu marques le numéro inscrit sur cette quille ;
- **plusieurs quilles tombées** : tu marques le **nombre de quilles** tombées.

## OBJECTIF
Atteindre le score cible **exactement**.

## OPTIONS DE L'APPLICATION
- dépassement → **retour à 25** ;
- élimination après **3 MISS consécutifs** ;
- score cible configurable selon le mode.

> La configuration prévoit **2 à 6 joueurs** et indique actuellement qu'il n'y a pas de bots.`,
  },
  {
    id: "molkky-fast",
    sport: "molkky",
    title: "Mölkky · Rapide",
    aliases: ["molkky rapide", "molkky fast"],
    route: "molkky_config",
    text: `## MÖLKKY RAPIDE
Variante destinée à raccourcir la partie via une **cible de score adaptée**.

Les règles de comptage restent basées sur les quilles tombées. Vérifie dans Configuration la cible exacte et les options de dépassement / élimination.`,
  },
  {
    id: "molkky-custom",
    sport: "molkky",
    title: "Mölkky · Personnalisé",
    aliases: ["molkky personnalise", "molkky custom"],
    route: "molkky_config",
    text: `## MÖLKKY PERSONNALISÉ
Tu choisis toi-même les paramètres principaux.

## RÉGLAGES
- **score cible** ;
- dépassement avec retour à 25 ON/OFF ;
- élimination après 3 MISS ON/OFF ;
- participants.

> L'écran rappelle que la cible doit être atteinte exactement lorsque cette règle est active.`,
  },

  {
    id: "dice-duel",
    sport: "dice",
    title: "Dice Duel",
    aliases: ["dice duel", "duel des", "des duel"],
    route: "dice_config",
    text: `## DICE DUEL
Course au score à **2 joueurs**.

## PRINCIPE
- **2 dés** ;
- chaque lancer ajoute la **somme des dés** ;
- cible par défaut indiquée : **100** ;
- format de **sets / Best Of** configurable.

Le premier à atteindre l'objectif du duel remporte la manche selon le format choisi.`,
  },
  {
    id: "dice-race",
    sport: "dice",
    title: "Dice Race",
    aliases: ["dice race", "course des", "des race"],
    route: "dice_config",
    text: `## DICE RACE
Variante de course au score.

## PRINCIPE
- **3 dés** ;
- chaque lancer ajoute la somme ;
- cible indiquée : **200** ;
- sets configurables.

C'est une version plus nerveuse du duel avec davantage de points possibles à chaque lancer.`,
  },
  {
    id: "dice-10000",
    sport: "dice",
    title: "10 000",
    aliases: ["10000", "10 000", "dix mille des", "dice tenk"],
    route: "dice_config",
    text: `## 10 000 — DÉS
Le catalogue contient un mode **6 dés** avec cible **10 000**.

> La version indiquée dans le menu est une version simplifiée. Pour les règles de combinaisons / prise de risque plus avancées, consulte aussi Farkle.`,
  },
  {
    id: "dice-yam",
    sport: "dice",
    title: "YAM",
    aliases: ["yam", "yams", "yahtzee"],
    route: "dice_yams_config",
    text: `## YAM
Mode à **5 dés** avec feuille de score.

## JEU
- jusqu'à **2 relances** selon la configuration actuelle ;
- tu conserves les dés intéressants entre les lancers ;
- tu remplis une catégorie de la scorecard ;
- la partie additionne les catégories et bonus applicables.

## CONFIGURATION
Choisis les deux joueurs et les paramètres disponibles avant de lancer.`,
  },
  {
    id: "dice-farkle",
    sport: "dice",
    title: "Farkle",
    aliases: ["farkle", "regles farkle", "bank bust farkle"],
    route: "dice_farkle_config",
    text: `## FARKLE
Mode **push-your-luck** : tu marques grâce aux combinaisons puis décides de continuer ou de **banker** les points.

## RISQUE
Un lancer sans combinaison valable provoque un **bust** et peut faire perdre les points non sécurisés du tour.

## CONFIGURATION PRÉVUE
- score cible ;
- nombre de dés ;
- sets ;
- départ minimum (option indiquée comme placeholder) ;
- Hot Dice (option indiquée comme placeholder).

> Certaines fonctions sont encore signalées comme « à venir / placeholder » dans le code actuel : Awena doit le dire plutôt que les présenter comme terminées.`,
  },
  {
    id: "dice-421",
    sport: "dice",
    title: "421",
    aliases: ["421", "quatre deux un", "regles 421"],
    route: "dice_421_config",
    text: `## 421
Mode basé sur la hiérarchie des **combinaisons de trois dés**.

## CONFIGURATION ACTUELLE
- manches ;
- sets ;
- annonces ;
- pénalités.

> Les options « Annonces » et « Pénalités » sont encore marquées **placeholder** dans la configuration actuelle. Je ne dois donc pas inventer leur fonctionnement final.`,
  },
  {
    id: "dice-poker",
    sport: "dice",
    title: "Poker Dice",
    aliases: ["poker dice", "poker des", "des poker"],
    route: "dice_poker_config",
    text: `## POKER DICE
Mode à **5 dés** inspiré des combinaisons du poker.

## CONFIGURATION
- manches ;
- nombre de relances ;
- sets ;
- option de quinte basse actuellement indiquée comme **placeholder**.

## COMBINAISONS
Le principe est de rechercher des combinaisons de type paire, brelan, carré, full ou suite selon les règles actives du mode.`,
  },

  {
    id: "football-duel",
    sport: "football",
    title: "Football · Duel",
    aliases: ["football 1v1", "foot 1v1", "duel football", "duel foot"],
    route: "foot_config",
    text: `## FOOTBALL — DUEL
Format **1 contre 1**.

## CONFIGURATION
Sélectionne exactement deux profils puis règle les paramètres proposés :
- nombre d'actions / tirs par camp selon le mode ;
- durée des mi-temps si le mode est chronométré ;
- nombre de mi-temps ;
- pause ;
- remplacements lorsque disponibles ;
- visibilité publique / privée si la fonction réseau est utilisée.`,
  },
  {
    id: "football-teams",
    sport: "football",
    title: "Football · Équipes",
    aliases: ["football 2v2", "football 3v3", "football 5v5", "football 7v7", "football 8v8", "football 11v11", "equipes football"],
    route: "foot_config",
    text: `## FOOTBALL — FORMATS ÉQUIPES
Le menu prévoit **2V2, 3V3, 5V5, 7V7, 8V8 et 11V11**.

## CONFIGURATION
Tu peux partir de joueurs / équipes enregistrés puis constituer les camps. Le nombre requis dépend du format.

## PARAMÈTRES
L'écran de configuration prévoit notamment le temps d'une mi-temps, le nombre de mi-temps, la pause, les remplacements et des options de visibilité.`,
  },
  {
    id: "football-penalty",
    sport: "football",
    title: "Football · Penalty",
    aliases: ["penalty football", "penalty foot", "tirs au but football"],
    route: "foot_config",
    text: `## FOOTBALL — PENALTY
Variante axée sur une série de **tirs par camp**.

La configuration propose un nombre de tirs et la composition des camps. La condition de victoire dépend du résultat de la série telle qu'elle est paramétrée.`,
  },

  {
    id: "babyfoot-match",
    sport: "babyfoot",
    title: "Baby-foot · Match",
    aliases: ["baby foot match", "babyfoot 1v1", "babyfoot 2v2", "babyfoot 2v1", "match babyfoot"],
    route: "babyfoot_config",
    text: `## BABY-FOOT — MATCH
Le module Match accepte plusieurs formats, notamment **1V1, 2V2 et 2V1**.

## CONFIGURATION
La configuration guidée ou complète permet de choisir :
- participants / équipes ;
- objectif de score ;
- sets / format ;
- chrono lorsque le preset le prévoit ;
- règles avancées et pénalités selon le mode.

> Les règles spécifiques dépendent du preset sélectionné : je peux détailler ce que l'écran affiche au moment où tu me poses la question.`,
  },
  {
    id: "babyfoot-rules",
    sport: "babyfoot",
    title: "Baby-foot · Règles avancées",
    aliases: ["regles babyfoot", "barre babyfoot", "roulette babyfoot", "gamelle babyfoot", "penalite babyfoot"],
    route: "babyfoot_config",
    text: `## BABY-FOOT — RÈGLES AVANCÉES
La configuration contient plusieurs comportements personnalisables selon le preset.

## EXEMPLES PRÉSENTS DANS L'APPLICATION
Certaines actions peuvent être :
- **interdites** ;
- comptées uniquement en **statistique** ;
- autorisées avec **+1 but** ;
- sanctionnées par **-1** ;
- utilisées pour **annuler un but adverse** selon la règle choisie.

> Pour éviter toute confusion, demande-moi le nom exact de l'option visible et je peux lire sa valeur sur l'écran de configuration.`,
  },
  {
    id: "babyfoot-training",
    sport: "babyfoot",
    title: "Baby-foot · Training",
    aliases: ["training babyfoot", "entrainement babyfoot"],
    route: "babyfoot_menu",
    text: `## TRAINING BABY-FOOT
Le hub Baby-foot sépare **Match, Fun, Défis, Training, Ligue et Équipes**.

Le Training est destiné aux exercices / objectifs plutôt qu'à un match classique. Les détails de chaque exercice sont ceux proposés dans son menu dédié.`,
  },
  {
    id: "babyfoot-league",
    sport: "babyfoot",
    title: "Baby-foot · Ligue",
    aliases: ["ligue babyfoot", "league babyfoot", "classement babyfoot"],
    route: "babyfoot_league",
    text: `## LIGUE BABY-FOOT
La Ligue sert à organiser un suivi structuré des rencontres et des équipes dans la durée.

> Elle est distincte d'un simple match ponctuel et du module Tournois général.`,
  },
];

function scoreEntry(question: string, entry: SportsEntry, context: AwenaRuntimeContext) {
  const q = norm(question);
  let score = 0;
  for (const alias of entry.aliases) {
    const a = norm(alias);
    if (q === a) score += 14;
    else if (q.includes(a)) score += Math.max(5, a.split(" ").length * 3);
  }
  const sport = norm(context.sport || "");
  if (sport && sport.includes(entry.sport)) score += 2;
  const route = norm(context.route || "");
  if (route.includes(entry.sport) || (entry.sport === "football" && route.startsWith("foot"))) score += 2;
  return score;
}

export function answerAwenaSportsKnowledge(question: string, context: AwenaRuntimeContext): AwenaReply | null {
  const q = norm(question);
  if (!q) return null;

  let best: SportsEntry | null = null;
  let bestScore = 0;
  for (const entry of ENTRIES) {
    const score = scoreEntry(q, entry, context);
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }

  // A sport-aware page can resolve a short question such as "et les règles ?",
  // but only if a sport is clearly active. Otherwise require an explicit alias
  // to avoid stealing generic questions from the rest of Awena.
  const asksRulesOrConfig = /regle|comment jouer|configuration|configurer|option|variante|objectif|victoire|combien de joueur/.test(q);
  if (bestScore < 5 && !(best && bestScore >= 2 && asksRulesOrConfig && context.sport)) return null;
  if (!best) return null;

  return {
    knowledgeTopic: `sport:${best.id}`,
    text: best.text,
    actions: actions(best),
  };
}

export function awenaSportsKnowledgeCount() {
  return ENTRIES.length;
}
