import type { AwenaAction } from "./awena.types";
import { dartsGameRegistry, type DartsGameDef } from "../games/dartsGameRegistry";
import { getTicker } from "../lib/tickers";
import { formatAwenaConfiguration, getAwenaModeConfigDetail } from "./AwenaConfigKnowledge";

export type AwenaModeKnowledge = {
  id: string;
  label: string;
  aliases: string[];
  summary: string;
  tip: string;
  howToPlayInApp: string;
  configRoute?: string;
  tickerSrc?: string;
  sport: "darts";
  category: string;
  maxPlayers: number;
  supportsTeams: boolean;
  supportsBots: boolean;
  statsKey?: string;
  entry: "games" | "training";
  configuration: string;
  victoryCondition: string;
  variants: string[];
};

const TICKER_KEYS: Record<string, string> = {
  // Noms canoniques des tickers déjà utilisés par les écrans du projet.
  // Ne pas inventer de nouveaux fichiers : Awena réutilise les assets existants.
  x01: "x01",
  cricket: "cricket",
  darts_poker: "darts_poker",
  cargo: "cargo",
  killer: "killer",
  killer_progressive: "killer",
  shanghai: "shanghai",
  battle_royale: "battle_royale",
  warfare: "warfare",
  five_lives: "five_lives",
  golf: "golf",
  gros_6: "gros_6",
  scram: "scram",
  super_bull: "super_bull",
  halve_it: "halve_it",
  bobs_27: "bobs_27",
  knockout: "knockout",
  shooter: "shooter",
  baseball: "baseball",
  attrape_moi: "attrape_moi",
  president: "president",
  football: "football",
  rugby: "rugby",
  capital: "capital",
  departements: "departements",
  darts_firefighter: "darts_firefighter",
  loterie: "loterie",
  crados: "crados",
  bss_king: "bss_king",
  fifty_one_by_five: "51_by_5",
  looper: "looper",
  call_three: "call_three",
  steeplechase: "steeplechase",
  ptit_hun: "ptit_hun",
  prisoner: "prisoner",
  tic_tac_toe: "tic_tac_toe",
  bastard: "batard_players",
  fun_gages: "fun_gages",
  bowling: "bowling",
  mario_kart: "darts_racer",
  ocean_control: "ocean_control",
  tour_horloge: "tour_horloge",
  training_doubleio: "training_doubleio",
  training_time_attack: "training_time_attack",
  training_ghost: "training_ghost",
  training_precision_gauntlet: "training_precision_gauntlet",
  training_repeat_master: "training_repeat_master",
};

function tickerFor(game: DartsGameDef): string | undefined {
  const key = TICKER_KEYS[game.id] || game.id;
  return (
    // Préférer d'abord le nom canonique "ticker_<clé>" réellement utilisé
    // par les imports des écrans, puis seulement les recherches partielles.
    getTicker(`ticker_${key}`) ||
    getTicker(key) ||
    getTicker(game.label) ||
    undefined
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  classic: "Classiques",
  variant: "Variantes",
  challenge: "Défis",
  fun: "Fun",
  training: "Training",
};

const ALIAS_OVERRIDES: Record<string, string[]> = {
  x01: ["x01", "x zero un", "301", "501", "701", "901"],
  darts_firefighter: ["darts firefighter", "firefighter", "pompier", "pompiers", "incendie", "canadair"],
  darts_poker: ["darts poker", "poker flechettes"],
  attrape_moi: ["attrape moi", "attrape-moi", "attrape moi si tu peux", "chasseur", "fuyard", "catch me"],
  mario_kart: ["darts racer", "racer", "mario kart"],
  gros_6: ["gros 6", "gros six", "big 6", "big six"],
  departements: ["territories", "territoires", "departements", "départements"],
  bastard: ["batard", "bâtard"],
  bobs_27: ["bobs 27", "bob s 27", "bob's 27"],
  tour_horloge: ["tour de l horloge", "horloge"],
  training_doubleio: ["double in double out", "double in", "double out", "di do"],
  training_time_attack: ["time attack", "attaque chrono"],
  training_ghost: ["ghost mode", "ghost", "fantome", "fantôme"],
  training_precision_gauntlet: ["precision gauntlet", "gauntlet"],
  training_repeat_master: ["repeat master"],
  training_super_bull: ["super bull training", "training super bull"],
  ocean_control: ["ocean control", "ocean's control", "bataille navale"],
  crados: ["crados", "crado", "crasse", "crasses", "contamination", "secteur sale", "zone crado", "zones crado", "douche", "bull douche", "blocage crados", "vol crados", "course au secteur", "course crados", "prise en main", "bull propre contagieux", "carte des zones", "radar crados", "journal crados", "filtres crados", "liste joueurs crados"],
  bss_king: ["bss king", "bss", "boit sans soif", "boit-sans-soif", "ecusson bss", "écusson bss", "trone bss", "trône bss", "couronnement bss", "defi bss", "défi bss"],
  fifty_one_by_five: ["51 by 5", "51 par 5", "fifty one by five", "cinquante et un par cinq", "division par 5", "divisible par 5", "quotient", "bust 51 by 5"],
  looper: ["looper", "loop", "boucle", "boucles", "cible exacte", "segment exact", "simple interieur", "simple exterieur", "bouclier looper", "vies looper"],
  call_three: ["call three", "call 3", "appel trois", "appelle trois", "trois cibles", "full call", "caller", "phase d appel"],
  steeplechase: ["steeplechase", "steeple chase", "course obstacles", "course autour de la cible", "haies", "t13", "t17", "t8", "t5", "petit simple", "bull final"],
  ptit_hun: ["p'tit 1", "ptit 1", "petit 1", "petit un", "le p'tit hun", "ptit hun", "petit hun", "anti score", "triple nul", "jackpot", "zone spéciale", "zero absolu", "zéro absolu", "bouclier du hun", "dbull", "gros simple"],
};

const TEXT_OVERRIDES: Record<string, Partial<Pick<AwenaModeKnowledge, "summary" | "tip" | "howToPlayInApp">>> = {
  x01: {
    summary: "En X01, chaque joueur part du score choisi et soustrait le total de ses fléchettes. Le premier qui atteint exactement zéro gagne. Selon la configuration, l'entrée et la sortie peuvent être Simple, Double ou Master ; un bust annule la volée lorsque la finition n'est pas valide.",
    tip: "Prépare une sortie confortable et adapte la route au nombre de fléchettes restantes. En Double Out, les doubles 16 et 20 offrent souvent de bonnes routes de secours.",
    howToPlayInApp: "Ouvre Jeux > Fléchettes > X01. Choisis 301, 501, 701 ou 901, les joueurs ou équipes, les bots éventuels, le mode d'entrée, le mode de sortie et les legs/sets, puis démarre la partie.",
  },
  killer: {
    howToPlayInApp: "Ouvre Jeux > Fléchettes > Killer. Choisis les joueurs ou bots, la variante et les paramètres de vies/validation proposés sur l'écran de configuration, puis démarre.",
  },
  darts_firefighter: {
    howToPlayInApp: "Ouvre Jeux > Fléchettes > Darts Firefighter. Configure la mission et les joueurs, puis démarre l'intervention. En jeu, les touches déclenchent des actions de lutte contre le feu sur les territoires et les actions spéciales doivent être utilisées au bon moment.",
    tip: "Priorise les territoires critiques et ceux qui risquent de propager le feu. Le Canadair est surtout rentable lorsque plusieurs zones menacées peuvent être sécurisées par une même intervention.",
  },
  darts_poker: {
    howToPlayInApp: "Ouvre Jeux > Fléchettes > Darts Poker. Sélectionne les joueurs ou bots puis démarre. Le marché associe ensuite les secteurs 1 à 20 aux cartes visibles ; chaque main se construit dans la limite prévue par le mode.",
  },
  gros_6: {
    summary: "En Gros 6 / Big 6, la partie démarre en général sur Gros 6. Chaque joueur a 3 fléchettes pour toucher exactement la cible courante. En cas d'échec après 3 fléchettes, il perd une vie. S'il valide la cible, il utilise les fléchettes restantes — ou une volée bonus si l'option de 3e fléchette est activée — pour imposer la cible suivante au joueur ou à l'équipe suivante. Le joueur qui a imposé cette cible ne rejoue plus tant qu'un autre joueur n'a pas validé une nouvelle cible.",
    tip: "Les simples Gros/Petit, les doubles, les triples, Bull/Double Bull et les zones hors cible peuvent être des cibles différentes selon la configuration. Choisir une cible difficile met la pression, mais rater sa sélection fait perdre une vie.",
    howToPlayInApp: "Ouvre Jeux > Fléchettes > Gros 6. Choisis le mode guidé ou complet, les joueurs ou équipes, le nombre de vies, la règle stricte ou par valeur, l'activation du Bull, des zones spéciales et du bonus de 3e fléchette, puis démarre la partie.",
  },
  attrape_moi: {
    tip: "Le Fuyard doit protéger son avance ; le Chasseur doit réduire l'écart sans gaspiller de tours. La prise de risque dépend donc du rôle et du nombre de rounds restants.",
  },
  crados: {
    summary: "CRADOS est un jeu de territoire et de survie. Les simples, doubles et triples déposent respectivement 1, 2 ou 3 couches. Une zone devient possédée quand le seuil configuré est atteint. Un MISS ajoute toujours +2 crasses. Quand la Douche est active, un DOUBLE retire 2 crasses, un BULL en retire 1 et un DBULL en retire 3, tout en conservant l’effet normal du Double sur le secteur. Pour un secteur encore libre, la variante Prise en main fait repartir la progression au dernier camp qui touche, tandis que la variante Course conserve les touches de chaque camp : le premier au seuil remporte le secteur et les touches adverses déjà accumulées sont converties en crasse. Toucher une zone possédée par un adversaire applique la règle Blocage ou Vol. Par défaut, l’option « Jauge pleine = fin de manche » arrête immédiatement la manche lorsqu’un camp atteint la limite de crasse : le camp restant le plus propre gagne la manche. Si cette option est désactivée, le camp à 100 % est éliminé et la manche continue jusqu’au dernier camp encore propre.",
    tip: "Surveille à la fois ta jauge de crasse, le numéro du tour, les zones proches du seuil et l'ordre de jeu. Awena peut annoncer en quelques mots une cible conseillée au début de ton tour : elle privilégie une zone déjà avancée, un secteur libre, une zone adverse fragile en mode Vol, ou le Bull si ta jauge devient dangereuse. En Blocage, protège ta jauge. En Vol, attaque lorsque le gain territorial compense le +1 crasse par contact. En Course, un secteur à 2/3 pour un adversaire devient urgent. Avec Bull propre contagieux, un Bull ou DBull joué à 0 crasse peut répandre respectivement 1 ou 3 crasses sur tous les autres camps.",
    howToPlayInApp: "Ouvre Jeux > Fléchettes > CRADOS. Choisis Joueurs ou Équipes, profils/bots, ordre, limite de crasse, couches pour posséder une zone, Prise en main ou Course sur secteur vierge, Blocage ou Vol sur secteur adverse, Douche au Bull, Bull propre contagieux, l’option Jauge pleine = fin de manche, le format et la méthode de saisie. En partie : le bloc joueur actif montre le score de crasse, sa jauge, la manche, le TOUR et la VOLÉE en cours ; Awena donne aussi un conseil vocal bref sur la cible à viser. Le mini-radar ouvre la CARTE DES ZONES, les deux lignes de KPI résument la partie, le bandeau joueurs ouvre l'ordre complet et le bouton journal affiche les dernières actions. Dans la carte, TOUT affiche tous les propriétaires, LIBRES isole les zones vierges et chaque médaillon filtre le joueur correspondant. Les parties en cours sont enregistrées dans Historique et peuvent être reprises avec leur état, leur volée en cours et leur multiplicateur.",
  },
  bss_king: {
    summary: "BSS KING fonctionne en trois étapes très simples. 1) Tous les joueurs tentent le même objectif avec jusqu’à 3 fléchettes. 2) Le meilleur score de la tournée gagne 1 écusson BSS ; une égalité en tête ne donne rien. 3) Dès qu’un joueur atteint le quota d’écussons, son prochain objectif personnel devient le Trône : s’il touche le Bull final demandé, il gagne immédiatement la partie et devient BSS KING. Les défis peuvent demander un score libre, un secteur précis, des Doubles, des Triples, le Bull ou une plage de secteurs. Les points BSS correspondent au total cumulé des points marqués sur les tournées et servent aussi de départage quand plusieurs joueurs ont le même nombre d’écussons.",
    tip: "Ne cherche pas automatiquement le T20 : lis d’abord la case OBJECTIF du joueur actif. Sur une tournée, le but est seulement de faire mieux que les autres sur le défi affiché. Les points BSS suivent le barème du défi actif et s’additionnent pendant toute la partie. Dès que tu passes en phase TRÔNE, oublie le score : une seule touche du Bull demandé suffit pour gagner.",
    howToPlayInApp: "Ouvre Jeux > Fléchettes > BSS KING. Choisis Partie Rapide pour jouer avec les personnages BSS en manuel, ou Arcade pour affronter les BOTS IA BSS. Sélectionne les participants, le quota de 3/5/7 écussons, les défis Chaos éventuels et le Bull final. En partie, lis la case OBJECTIF MAINTENANT dans le bloc du joueur actif : elle indique exactement quoi viser, le barème et combien d’écussons il manque avant le Trône. Les boutons infos ouvrent aussi des blocs flottants pour les règles, les points BSS, le classement et le journal.",
  },
  fifty_one_by_five: {
    summary: "51 BY 5 est un jeu de calcul et de régularité. Chaque volée utilise jusqu’à 3 fléchettes : on additionne leur valeur brute, puis la volée ne marque que si ce total est divisible par 5. Le quotient est ajouté au score. En règle classique, les 3 fléchettes doivent toutes scorer. Il faut atteindre exactement l’objectif choisi — 31, 51, 71 ou 101 — et un dépassement applique la règle de bust configurée : score conservé ou retour à zéro.",
    tip: "Raisonne en quotient avant de lancer. Si tu dois ajouter 5 points au compteur, cherche 25 points bruts ; pour +10, cherche 50. En fin de partie, multiplie exactement le reste par 5 et construis une volée réalisable en gardant trois fléchettes marquantes si cette option est active.",
    howToPlayInApp: "Ouvre Jeux > Fléchettes > 51 BY 5. Choisis les participants ou bots, l’objectif 31/51/71/101, l’obligation éventuelle de scorer avec les 3 fléchettes, la règle de bust, le format BO1/BO3/BO5 et la méthode de saisie. Pendant la partie, la prévisualisation indique le total brut, sa divisibilité par 5, le quotient potentiel et le risque de bust. Les parties sont sauvegardées dans Historique et les records détaillent notamment volées valides, busts, meilleur quotient et meilleure série valide.",
  },
  looper: {
    summary: "LOOPER est un jeu de survie à cible imposée. Chaque joueur doit toucher la cible exacte en cours. Quand la règle exacte est active, la distinction peut aller jusqu’au lit précis : simple intérieur, simple extérieur, double, triple, Bull ou DBull. Une réussite permet de survivre et de poser la cible suivante ; un échec coûte une vie, sauf si un bouclier disponible absorbe la pénalité. Le dernier survivant remporte la manche.",
    tip: "Touche d’abord la cible imposée le plus tôt possible dans la volée. Une fois sécurisé, utilise les fléchettes restantes pour poser une cible suivante difficile pour l’adversaire. Les doubles, triples et Bulls sont généralement plus risqués mais plus agressifs lorsqu’ils peuvent devenir la prochaine cible.",
    howToPlayInApp: "Ouvre Jeux > Fléchettes > LOOPER. Configure le nombre de vies, la cible de départ aléatoire ou au lancer, la cible exacte, les boucles numériques, le bouclier du poseur, les bots, le format et la saisie. En jeu, la cible active et sa zone exacte sont affichées en permanence ; le journal indique les vies, boucliers, touches et cibles posées. Historique conserve la reprise complète de la partie et de la volée en cours.",
  },
  call_three: {
    summary: "CALL THREE alterne une phase d’appel et une phase de tir. Avant la volée, le caller définit trois cibles. Le tireur dispose ensuite d’une fléchette par cible lorsque l’ordre strict est actif. Un Simple vaut 1 point, un Double 2, un Triple 3 ; Bull et DBull utilisent leur barème spécifique. Réussir les trois appels constitue un Full Call. Après le nombre de rounds prévu, le meilleur total gagne ; une égalité déclenche un round supplémentaire.",
    tip: "Comme caller, mélange une cible fiable avec une ou deux cibles plus exigeantes pour mettre la pression. Comme tireur, ne sacrifie pas la première cible pour viser un multiplicateur trop ambitieux : en ordre strict, chaque fléchette correspond à son appel. En overtime, privilégie la régularité.",
    howToPlayInApp: "Ouvre Jeux > Fléchettes > CALL THREE. Choisis le nombre de rounds, le mode de caller, l’ordre strict ou libre, l’autorisation du Bull, le scoring des multiplicateurs, les participants/bots et le format. En partie, la phase CALLER permet de choisir les trois cibles avant de passer automatiquement à la phase de jeu. Les stats suivent points, hits, Full Calls, meilleures volées, séries et multiplicateurs réussis.",
  },
  steeplechase: {
    summary: "STEEPLECHASE est une course autour de la cible. Le parcours suit l’ordre physique des secteurs en partant du 20. Les étapes normales demandent un simple — le petit simple intérieur lorsque cette règle est activée. Les haies 13, 17, 8 et 5 doivent être franchies en Triple si les haies sont actives. Après le dernier secteur, l’arrivée se fait au Bull ou uniquement au DBull selon la configuration. Le premier à terminer le parcours gagne la manche.",
    tip: "Sur les étapes normales, cherche surtout la précision pour avancer vite. Garde ton agressivité pour les quatre haies : un T13/T17/T8/T5 réussi économise beaucoup de fléchettes. À l’approche de l’arrivée, adapte ton risque selon que le Bull simple suffit ou que le DBull est obligatoire.",
    howToPlayInApp: "Ouvre Jeux > Fléchettes > STEEPLECHASE. Choisis le sens horaire ou anti-horaire, petit simple intérieur ou simple libre, activation des haies, Bull ou DBull à l’arrivée, les participants/bots, le format et la méthode de saisie. En jeu, la piste affiche la progression, les haies, la cible active et les statistiques de course. Historique permet la reprise avec la volée courante.",
  },
  ptit_hun: {
    summary: "P’TIT 1 est un jeu où le but est de finir avec le score le plus petit possible, en évitant les pièges et en profitant des bonus. Les petits simples coûtent peu de points ; les gros simples, Doubles, Triples, Bull25 et MISS sont plus dangereux. DBULL, Jackpot, Triple Nul, Bouclier du Hun et Zéro Absolu peuvent faire baisser ou protéger le score selon la configuration.",
    tip: "Le petit simple du 1 est la cible naturellement la moins coûteuse. Mais surveille le Jackpot : un Double ou Triple spécial peut offrir une volée à 0. Quand ton score devient élevé, le DBULL est une option de retour très puissante.",
    howToPlayInApp: "Ouvre Jeux > Fléchettes > P’TIT 1. La configuration guidée sépare participants, score & zones, bonus, Jackpot, format et saisie. Tu peux modifier les multiplicateurs, la pénalité MISS, le DBULL, le seuil du Zéro Absolu, le Triple Nul, le Bouclier et les zones Jackpot. En jeu, bascule PETIT/GROS au keypad et surveille la zone Jackpot affichée en permanence.",
  },
};

function normalize(text: string) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function aliasesFor(game: DartsGameDef) {
  const raw = [
    game.id,
    game.label,
    game.infoTitle,
    game.variantId,
    game.presetVariantId,
    game.tab,
    ...(ALIAS_OVERRIDES[game.id] || []),
  ].filter(Boolean) as string[];
  return Array.from(new Set(raw.map((value) => normalize(value)).filter(Boolean)));
}

function defaultTip(game: DartsGameDef) {
  if (game.entry === "training") return "Travaille d'abord la régularité et compare tes séries dans les statistiques plutôt que de chercher un seul gros coup.";
  if (game.category === "challenge") return "Lis l'objectif du round avant chaque volée et privilégie la touche qui fait progresser directement la condition du défi.";
  if (game.category === "fun") return "Observe l'état du plateau et les effets spéciaux du mode avant de viser : dans les modes Fun, le meilleur choix n'est pas toujours le plus gros score brut.";
  return "Adapte ta stratégie à l'objectif du mode et à l'état de la partie plutôt que de viser systématiquement le score maximal.";
}

function defaultHowToPlay(game: DartsGameDef) {
  if (game.entry === "training") {
    return `Ouvre Jeux > Fléchettes > Training puis sélectionne ${game.label}. Configure l'exercice lorsqu'une option est proposée, puis lance la session.`;
  }
  return `Ouvre Jeux > Fléchettes > ${game.label}. Configure les participants et les options affichées pour ce mode, puis appuie sur Démarrer la partie.`;
}

function baseConfigurationFor(game: DartsGameDef) {
  const participants = game.maxPlayers === 1 ? "solo" : `jusqu'à ${game.maxPlayers} joueurs`;
  const teams = game.supportsTeams ? "équipes prises en charge" : "pas d'équipes";
  const bots = game.supportsBots ? "bots IA pris en charge" : "pas de bots IA";
  const category = CATEGORY_LABELS[game.category] || game.category;
  return `${game.label} est classé dans ${category}. Participants : ${participants}, ${teams}, ${bots}.`;
}

function toKnowledge(game: DartsGameDef): AwenaModeKnowledge {
  const override = TEXT_OVERRIDES[game.id] || {};
  return {
    id: game.id,
    label: game.label,
    aliases: aliasesFor(game),
    summary: override.summary || game.infoBody,
    tip: override.tip || defaultTip(game),
    howToPlayInApp: override.howToPlayInApp || defaultHowToPlay(game),
    configRoute: game.tab === "mode_not_ready" ? undefined : game.tab,
    tickerSrc: tickerFor(game),
    sport: "darts",
    category: CATEGORY_LABELS[game.category] || game.category,
    maxPlayers: game.maxPlayers,
    supportsTeams: game.supportsTeams,
    supportsBots: game.supportsBots,
    statsKey: game.statsKey,
    entry: game.entry,
    configuration: formatAwenaConfiguration(game.label, baseConfigurationFor(game), getAwenaModeConfigDetail(game.id)),
    victoryCondition: getAwenaModeConfigDetail(game.id)?.victory || game.infoBody,
    variants: getAwenaModeConfigDetail(game.id)?.variants || [],
  };
}

// Source de vérité : uniquement les modes déclarés READY dans le registre officiel.
const MODES: AwenaModeKnowledge[] = dartsGameRegistry.filter((game) => game.ready).map(toKnowledge);

function matches(mode: AwenaModeKnowledge, raw: string) {
  const value = normalize(raw);
  if (!value) return false;
  return mode.aliases.some((alias) => value.includes(alias));
}

function actionFor(mode: AwenaModeKnowledge, currentRoute?: string): AwenaAction[] {
  if (!mode.configRoute) return [];
  const currentScreenMode = routeToAwenaMode(currentRoute);
  if (currentScreenMode?.id === mode.id) return [];
  return [{
    id: `open-${mode.id}`,
    label: `Ouvrir ${mode.label}`,
    kind: "navigate",
    route: mode.configRoute,
    modeId: mode.id,
    imageSrc: mode.tickerSrc,
    imageAlt: `Ouvrir ${mode.label}`,
  }];
}

export function routeToAwenaMode(route?: string): AwenaModeKnowledge | null {
  const value = normalize(route || "");
  if (!value || value === "training" || value === "games") return null;

  // D'abord les correspondances de route exactes. En cas de route partagée,
  // les modes de base apparaissent avant leurs variantes dans le registre.
  const exactRoute = MODES.find((mode) => normalize(mode.configRoute || "") === value);
  if (exactRoute) return exactRoute;

  return MODES.find((mode) => matches(mode, value)) || null;
}

export function findAwenaMode(input?: string, rememberedModeOrRoute?: string): AwenaModeKnowledge | null {
  const explicit = MODES.find((mode) => matches(mode, input || ""));
  if (explicit) return explicit;

  const rememberedById = MODES.find((mode) => normalize(mode.id) === normalize(rememberedModeOrRoute || ""));
  if (rememberedById) return rememberedById;

  return routeToAwenaMode(rememberedModeOrRoute);
}

export function findAwenaModeById(id?: string): AwenaModeKnowledge | null {
  const wanted = normalize(id || "");
  if (!wanted) return null;
  return MODES.find((mode) => normalize(mode.id) === wanted) || null;
}

export function actionsForAwenaMode(mode: AwenaModeKnowledge | null, currentRoute?: string): AwenaAction[] {
  return mode ? actionFor(mode, currentRoute) : [];
}

export function allAwenaModes() {
  return MODES.slice();
}

export function awenaModesByCategory() {
  return MODES.reduce<Record<string, AwenaModeKnowledge[]>>((acc, mode) => {
    (acc[mode.category] ||= []).push(mode);
    return acc;
  }, {});
}
