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
  attrape_moi: {
    tip: "Le Fuyard doit protéger son avance ; le Chasseur doit réduire l'écart sans gaspiller de tours. La prise de risque dépend donc du rôle et du nombre de rounds restants.",
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
