import type { AwenaAction } from "./awena.types";

export type AwenaNavigationTopic = {
  id: string;
  label: string;
  aliases: string[];
  route: string;
  description: string;
};

export type AwenaSportModeKnowledge = {
  id: string;
  sportId: string;
  label: string;
  aliases: string[];
  summary: string;
  howToPlayInApp: string;
  configRoute?: string;
};

export type AwenaSportKnowledge = {
  id: string;
  label: string;
  aliases: string[];
  menuRoute: string;
  description: string;
  modes: AwenaSportModeKnowledge[];
};

function norm(text: string) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_-]+/g, " ").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export const AWENA_NAVIGATION_TOPICS: AwenaNavigationTopic[] = [
  { id: "home", label: "Accueil", aliases: ["accueil", "home", "page d accueil"], route: "home", description: "Accueil rassemble le résumé du profil actif, les accès rapides et les informations principales de MULTISPORTS SCORING." },
  { id: "messages", label: "Messages", aliases: ["messages", "messagerie", "message"], route: "messages", description: "Messages ouvre le centre de messagerie de l'application." },
  { id: "profiles", label: "Profils", aliases: ["profils", "profil", "joueurs", "bots", "bot ia", "avatar"], route: "profiles", description: "Profils permet de gérer les joueurs locaux, les avatars et l'accès aux bots IA." },
  { id: "games", label: "Jeux", aliases: ["jeux", "modes", "modes de jeu", "sports"], route: "games", description: "Jeux permet de choisir le sport puis le mode de jeu ou l'entraînement souhaité." },
  { id: "tournaments", label: "Compétitions", aliases: ["competitions", "competition", "tournois", "tournoi"], route: "tournaments", description: "Compétitions regroupe la création et le suivi des tournois et rencontres compétitives." },
  { id: "online", label: "Online", aliases: ["online", "en ligne", "amis", "clubs"], route: "online", description: "Online regroupe les fonctions en ligne, les amis, les salons et les clubs disponibles." },
  { id: "stats", label: "Stats", aliases: ["stats", "statistiques", "records", "historique"], route: "stats", description: "Stats donne accès aux statistiques, historiques, classements et records enregistrés par les modes compatibles." },
  { id: "settings", label: "Réglages", aliases: ["reglages", "parametres", "settings", "theme", "audio", "voix awena"], route: "settings", description: "Réglages permet de modifier le thème, l'audio, Awena et les autres préférences de l'application." },
  { id: "screens", label: "Écrans", aliases: ["ecrans", "ecran", "cast", "diffusion", "affichage externe"], route: "cast_host", description: "Écrans sert à diffuser ou présenter une partie sur un autre écran compatible." },
];

const PETANQUE: AwenaSportModeKnowledge[] = [
  { id: "petanque_singles", sportId: "petanque", label: "Match simple", aliases: ["petanque simple", "match simple petanque", "1 contre 1 petanque"], summary: "Pétanque 1 contre 1 : 3 boules par joueur et par mène, jusqu'à 3 points par mène, premier à 13 points.", howToPlayInApp: "Jeux > Pétanque > Match simple, puis configure les joueurs et démarre.", configRoute: "petanque_config" },
  { id: "petanque_ffa3", sportId: "petanque", label: "Match à 3", aliases: ["petanque a 3", "match a 3 petanque", "ffa3"], summary: "Trois joueurs jouent chacun pour soi, avec 3 boules par joueur et un maximum de 3 points par mène. Premier à 13.", howToPlayInApp: "Jeux > Pétanque > Match à 3, configure les trois joueurs puis démarre.", configRoute: "petanque_config" },
  { id: "petanque_doublette", sportId: "petanque", label: "Doublette", aliases: ["doublette"], summary: "Doublette : 2 équipes de 2, 3 boules par joueur, score commun à l'équipe, première équipe à 13 points.", howToPlayInApp: "Jeux > Pétanque > Doublette, compose les deux équipes puis démarre.", configRoute: "petanque_config" },
  { id: "petanque_triplette", sportId: "petanque", label: "Triplette", aliases: ["triplette"], summary: "Triplette : 2 équipes de 3, 2 boules par joueur, score commun à l'équipe, première équipe à 13 points.", howToPlayInApp: "Jeux > Pétanque > Triplette, compose les équipes puis démarre.", configRoute: "petanque_config" },
  { id: "petanque_quadrette", sportId: "petanque", label: "Quadrette", aliases: ["quadrette"], summary: "Quadrette : 2 équipes de 4, 2 boules par joueur, score commun à l'équipe, première équipe à 13 points.", howToPlayInApp: "Jeux > Pétanque > Quadrette, compose les équipes puis démarre.", configRoute: "petanque_config" },
  { id: "petanque_training", sportId: "petanque", label: "Training Pétanque", aliases: ["training petanque", "entrainement petanque"], summary: "Entraînement Pétanque : exercices de pointage, tir et précision, organisés en séries avec suivi de progression.", howToPlayInApp: "Jeux > Pétanque > Training puis choisis l'exercice souhaité." },
];

const PINGPONG: AwenaSportModeKnowledge[] = [
  { id: "pingpong_1v1", sportId: "pingpong", label: "Ping-pong 1V1", aliases: ["ping pong 1v1", "pingpong 1v1", "tennis de table 1v1"], summary: "Match de ping-pong un joueur contre un joueur.", howToPlayInApp: "Jeux > Ping-pong > 1V1, puis configure la rencontre.", configRoute: "pingpong_config" },
  { id: "pingpong_2v2", sportId: "pingpong", label: "Ping-pong 2V2", aliases: ["ping pong 2v2", "pingpong 2v2"], summary: "Match en double : deux joueurs contre deux.", howToPlayInApp: "Jeux > Ping-pong > 2V2, puis configure les équipes.", configRoute: "pingpong_config" },
  { id: "pingpong_2v1", sportId: "pingpong", label: "Ping-pong 2V1", aliases: ["ping pong 2v1", "pingpong 2v1"], summary: "Match asymétrique : deux joueurs contre un.", howToPlayInApp: "Jeux > Ping-pong > 2V1, puis configure les joueurs.", configRoute: "pingpong_config" },
  { id: "pingpong_tournante", sportId: "pingpong", label: "Tournante", aliases: ["tournante ping pong", "tournante pingpong"], summary: "Mode Tournante de ping-pong avec rotation des joueurs autour de la table.", howToPlayInApp: "Jeux > Ping-pong > Tournante, puis configure les participants.", configRoute: "pingpong_config" },
  { id: "pingpong_training", sportId: "pingpong", label: "Training Ping-pong", aliases: ["training ping pong", "entrainement ping pong"], summary: "Entraînement solo avec objectifs et statistiques.", howToPlayInApp: "Jeux > Ping-pong > Training." },
];

const MOLKKY: AwenaSportModeKnowledge[] = [
  { id: "molkky_classic", sportId: "molkky", label: "Mölkky Classique", aliases: ["molkky classique", "molkky"], summary: "Mölkky classique : une quille tombée vaut son numéro, plusieurs quilles valent leur nombre. Objectif 50 exactement. Le dépassement peut renvoyer à 25 et trois MISS consécutifs peuvent éliminer selon la configuration.", howToPlayInApp: "Jeux > Mölkky > Classique, configure les joueurs et les options puis démarre.", configRoute: "molkky_config" },
  { id: "molkky_fast", sportId: "molkky", label: "Mölkky Rapide", aliases: ["molkky rapide"], summary: "Version rapide du Mölkky avec les mêmes principes et une cible configurable pour raccourcir la partie.", howToPlayInApp: "Jeux > Mölkky > Rapide, règle la cible puis démarre.", configRoute: "molkky_config" },
  { id: "molkky_custom", sportId: "molkky", label: "Mölkky Personnalisé", aliases: ["molkky personnalise", "molkky custom"], summary: "Mode personnalisé : cible, dépassement vers 25 et élimination après trois MISS sont configurables.", howToPlayInApp: "Jeux > Mölkky > Personnalisé puis règle les options.", configRoute: "molkky_config" },
];

const DICE: AwenaSportModeKnowledge[] = [
  { id: "dice_duel", sportId: "dice", label: "Dice Duel", aliases: ["dice duel", "duel des"], summary: "Deux dés, cible 100, le score est la somme des dés, avec formule en sets possible.", howToPlayInApp: "Jeux > Dés > Dice Duel puis configure la partie.", configRoute: "dice_config" },
  { id: "dice_race", sportId: "dice", label: "Dice Race", aliases: ["dice race", "course des"], summary: "Trois dés, cible 200, score par somme des dés, avec formule en sets possible.", howToPlayInApp: "Jeux > Dés > Dice Race puis configure la partie.", configRoute: "dice_config" },
  { id: "dice_10000", sportId: "dice", label: "10 000", aliases: ["10000", "10 000", "dix mille des"], summary: "Mode 10 000 simplifié avec 6 dés et objectif de 10 000 points.", howToPlayInApp: "Jeux > Dés > 10 000 puis configure la partie.", configRoute: "dice_config" },
  { id: "dice_yams", sportId: "dice", label: "Yam's", aliases: ["yams", "yam s"], summary: "Yam's : 5 dés, jusqu'à 2 relances, scorecard et bonus de partie haute.", howToPlayInApp: "Jeux > Dés > Yam's puis configure les joueurs.", configRoute: "dice_yams_config" },
  { id: "dice_farkle", sportId: "dice", label: "Farkle", aliases: ["farkle"], summary: "Farkle est un mode push-your-luck basé sur des combinaisons, avec choix entre continuer, bank et risque de bust.", howToPlayInApp: "Jeux > Dés > Farkle puis configure la partie.", configRoute: "dice_farkle_config" },
  { id: "dice_421", sportId: "dice", label: "421", aliases: ["421", "quatre deux un"], summary: "421 utilise les combinaisons, annonces et points propres au mode.", howToPlayInApp: "Jeux > Dés > 421 puis configure la partie.", configRoute: "dice_421_config" },
  { id: "dice_poker", sportId: "dice", label: "Poker Dice", aliases: ["poker dice", "poker des"], summary: "Poker Dice repose sur des combinaisons de poker obtenues aux dés dans des manches rapides.", howToPlayInApp: "Jeux > Dés > Poker Dice puis configure la partie.", configRoute: "dice_poker_config" },
];

const BABYFOOT: AwenaSportModeKnowledge[] = [
  { id: "babyfoot_match", sportId: "babyfoot", label: "Match Baby-foot", aliases: ["match baby foot", "babyfoot 1v1", "babyfoot 2v2", "babyfoot 2v1"], summary: "Matchs Baby-foot locaux en 1V1, 2V2 ou 2V1. La configuration permet notamment le score cible ou le chrono et des formules en sets.", howToPlayInApp: "Jeux > Baby-foot > Match, choisis le format et les équipes puis configure la rencontre.", configRoute: "babyfoot_config" },
  { id: "babyfoot_training", sportId: "babyfoot", label: "Training Baby-foot", aliases: ["training baby foot", "entrainement baby foot"], summary: "Training Baby-foot utilise des presets rapides de score cible ou de chrono pour s'entraîner.", howToPlayInApp: "Jeux > Baby-foot > Training." },
];

const FOOTBALL: AwenaSportModeKnowledge[] = [
  { id: "foot_penalty", sportId: "football_score", label: "Penalty", aliases: ["penalty foot", "tir au but"], summary: "Duel tireur contre gardien : 5 tirs par camp et mort subite possible en cas d'égalité.", howToPlayInApp: "Jeux > Football > Penalty, puis configure les deux camps.", configRoute: "foot_config" },
  ...["1v1","2v2","3v3","5v5","7v7","8v8","11v11"].map((id) => ({ id: `foot_${id}`, sportId: "football_score", label: `Football ${id.toUpperCase()}`, aliases: [`football ${id}`, `foot ${id}`], summary: `Format football ${id.toUpperCase()} avec gestion du score et des événements de match selon la configuration.`, howToPlayInApp: `Jeux > Football > ${id.toUpperCase()}, puis configure les équipes et la durée.`, configRoute: "foot_config" })),
];

export const AWENA_SPORTS: AwenaSportKnowledge[] = [
  { id: "darts", label: "Fléchettes", aliases: ["flechettes", "darts"], menuRoute: "games", description: "Le catalogue Fléchettes contient les modes classiques, défis, fun et Training enregistrés dans le registre officiel de l'application.", modes: [] },
  { id: "petanque", label: "Pétanque", aliases: ["petanque", "boules"], menuRoute: "petanque_menu", description: "Pétanque propose des matchs individuels, à trois, en équipes et des entraînements.", modes: PETANQUE },
  { id: "babyfoot", label: "Baby-foot", aliases: ["baby foot", "babyfoot", "baby-foot"], menuRoute: "babyfoot_menu", description: "Baby-foot propose les matchs locaux 1V1, 2V2, 2V1 et des presets d'entraînement.", modes: BABYFOOT },
  { id: "pingpong", label: "Ping-pong", aliases: ["ping pong", "pingpong", "tennis de table"], menuRoute: "pingpong_menu", description: "Ping-pong propose 1V1, 2V2, 2V1, Tournante et Training.", modes: PINGPONG },
  { id: "molkky", label: "Mölkky", aliases: ["molkky"], menuRoute: "molkky_menu", description: "Mölkky propose Classique, Rapide et Personnalisé.", modes: MOLKKY },
  { id: "dice", label: "Dés", aliases: ["des", "dice", "jeux de des"], menuRoute: "dice_menu", description: "Les jeux de dés comprennent Dice Duel, Dice Race, 10 000, Yam's, Farkle, 421 et Poker Dice.", modes: DICE },
  { id: "football_score", label: "Football", aliases: ["football", "foot"], menuRoute: "foot_menu", description: "Football permet de scorer des rencontres Penalty, 1V1, 2V2, 3V3, 5V5, 7V7, 8V8 et 11V11.", modes: FOOTBALL },
];

export function findAwenaNavigationTopic(input?: string) {
  const value = norm(input || "");
  if (!value) return null;
  return AWENA_NAVIGATION_TOPICS.find((topic) => topic.aliases.some((alias) => value.includes(norm(alias)))) || null;
}

export function findAwenaSport(input?: string, rememberedSport?: string) {
  const value = norm(input || "");
  const explicit = value ? AWENA_SPORTS.find((sport) => sport.aliases.some((alias) => value.includes(norm(alias)))) : null;
  if (explicit) return explicit;
  const remembered = norm(rememberedSport || "");
  return AWENA_SPORTS.find((sport) => norm(sport.id) === remembered || sport.aliases.some((alias) => norm(alias) === remembered)) || null;
}

export function findAwenaSportMode(input?: string, rememberedSport?: string) {
  const value = norm(input || "");
  if (!value) return null;
  const orderedSports = [...AWENA_SPORTS].sort((a, b) => (a.id === rememberedSport ? -1 : b.id === rememberedSport ? 1 : 0));
  for (const sport of orderedSports) {
    const found = sport.modes.find((mode) => mode.aliases.some((alias) => value.includes(norm(alias))));
    if (found) return found;
  }
  return null;
}

export function actionForNavigation(topic: AwenaNavigationTopic): AwenaAction[] {
  return [{ id: `nav-${topic.id}`, label: `Ouvrir ${topic.label}`, kind: "navigate", route: topic.route }];
}

export function actionForSport(sport: AwenaSportKnowledge): AwenaAction[] {
  return [{ id: `sport-${sport.id}`, label: `Ouvrir ${sport.label}`, kind: "navigate", route: sport.menuRoute }];
}

export function actionForSportMode(mode: AwenaSportModeKnowledge): AwenaAction[] {
  return mode.configRoute ? [{ id: `sport-mode-${mode.id}`, label: `Ouvrir ${mode.label}`, kind: "navigate", route: mode.configRoute }] : [];
}
