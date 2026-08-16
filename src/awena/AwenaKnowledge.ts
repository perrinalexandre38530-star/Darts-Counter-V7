import type { AwenaAction } from "./awena.types";
import tickerKiller from "../assets/tickers/ticker_killer_2.png";
import tickerFirefighter from "../assets/tickers/ticker_darts_firefighter.png";
import tickerPoker from "../assets/tickers/ticker_darts_poker.png";
import tickerAttrapeMoi from "../assets/tickers/ticker_attrape_moi.png";

export type AwenaModeKnowledge = {
  id: string;
  label: string;
  aliases: string[];
  summary: string;
  tip: string;
  howToPlayInApp: string;
  configRoute?: string;
  tickerSrc?: string;
};

function actionFor(mode: AwenaModeKnowledge, currentRoute?: string): AwenaAction[] {
  if (!mode.configRoute) return [];

  // Ne repropose jamais d'ouvrir le mode si l'utilisateur est déjà
  // sur sa configuration, son écran de jeu ou une autre page du même mode.
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

const MODES: AwenaModeKnowledge[] = [
  {
    id: "x01",
    label: "X01",
    aliases: ["x01", "301", "501", "701", "901"],
    summary: "En X01, chaque joueur part du score choisi et soustrait le total de ses fléchettes. Le premier qui atteint exactement zéro gagne. Si le Double Out est activé, la dernière fléchette doit être un double.",
    tip: "En Double Out, prépare un double confortable avant la fin. Les doubles 16 et 20 offrent beaucoup de routes de secours, mais le meilleur choix dépend toujours du score restant et du nombre de fléchettes disponibles.",
    howToPlayInApp: "Pour lancer un X01 dans l'application : ouvre Local, choisis Fléchettes puis X01. Sélectionne 301, 501, 701 ou 901, ajoute les joueurs ou équipes, règle le mode d'entrée et de sortie, puis les legs/sets si nécessaire. Appuie ensuite sur Démarrer la partie.",
    configRoute: "x01_config_v3",
  },
  {
    id: "killer",
    label: "Killer",
    aliases: ["killer"],
    summary: "Dans Killer, chaque joueur doit d'abord valider son numéro puis utiliser ses touches pour attaquer les vies des autres joueurs. Le dernier joueur encore en vie remporte la partie.",
    tip: "Ne cherche pas uniquement à attaquer. Sécurise d'abord ton statut de Killer, puis cible le joueur le plus dangereux selon ses vies restantes.",
    howToPlayInApp: "Pour jouer à Killer : ouvre Local > Fléchettes, choisis Killer, sélectionne la variante souhaitée, les joueurs ou bots et les paramètres de vies, puis démarre.",
    configRoute: "killer_config",
    tickerSrc: tickerKiller,
  },
  {
    id: "darts_firefighter",
    label: "Darts Firefighter",
    aliases: ["darts firefighter", "firefighter", "pompier", "incendie", "canadair"],
    summary: "Dans Darts Firefighter, les fléchettes déclenchent des actions de lutte contre l'incendie sur les territoires. Il faut protéger les zones menacées, gérer la propagation et utiliser les actions spéciales comme le Canadair au bon moment.",
    tip: "Priorise les territoires critiques et surveille la propagation. Une action spectaculaire vaut moins qu'une intervention qui évite plusieurs pertes au tour suivant.",
    howToPlayInApp: "Pour jouer à Darts Firefighter : ouvre Local > Fléchettes, sélectionne Darts Firefighter, prépare la mission et les joueurs, puis démarre l'intervention. Pendant la partie, les secteurs touchés déclenchent les actions de lutte contre le feu.",
    configRoute: "darts_firefighter_config",
    tickerSrc: tickerFirefighter,
  },
  {
    id: "darts_poker",
    label: "Darts Poker",
    aliases: ["darts poker", "poker"],
    summary: "Dans Darts Poker, les secteurs de la cible correspondent à des cartes. Chaque fléchette peut faire gagner une carte et l'objectif est de construire la meilleure main possible dans la limite de fléchettes prévue.",
    tip: "Observe les cartes encore disponibles avant chaque lancer : une cible moins évidente peut améliorer beaucoup plus fortement ta main.",
    howToPlayInApp: "Pour jouer à Darts Poker : ouvre Local > Fléchettes, choisis Darts Poker, sélectionne les joueurs ou bots puis démarre. Le tableau associe ensuite les secteurs 1 à 20 aux cartes disponibles.",
    configRoute: "darts_poker_config",
    tickerSrc: tickerPoker,
  },
  {
    id: "attrape_moi",
    label: "Attrape-moi si tu peux",
    aliases: ["attrape moi", "attrape-moi", "attrape", "chasseur", "fuyard", "catch me"],
    summary: "Attrape-moi si tu peux oppose un chasseur et un fuyard. Les deux rôles ont des objectifs différents et la pression change rapidement selon l'écart entre eux.",
    tip: "Adapte ta prise de risque à ton rôle : le fuyard doit maintenir son avance, tandis que le chasseur gagne à choisir les zones qui réduisent l'écart de façon régulière.",
    howToPlayInApp: "Pour jouer à Attrape-moi si tu peux : ouvre Local > Fléchettes, sélectionne le mode, choisis les joueurs et la formule de match, puis démarre. Les rôles de chasseur et de fuyard structurent ensuite la partie.",
    configRoute: "attrape_moi_config",
    tickerSrc: tickerAttrapeMoi,
  },
];

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

function matches(mode: AwenaModeKnowledge, raw: string) {
  const value = normalize(raw);
  if (!value) return false;
  return mode.aliases.some((alias) => value.includes(normalize(alias)));
}

export function routeToAwenaMode(route?: string): AwenaModeKnowledge | null {
  const value = normalize(route || "");
  if (!value) return null;
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
