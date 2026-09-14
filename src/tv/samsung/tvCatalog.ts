import { DARTS_GAMES } from "../../games/dartsGameRegistry";

import logoDarts from "../../assets/games/logo-darts.webp";
import logoPetanque from "../../assets/games/logo-petanque.webp";
import logoPingPong from "../../assets/games/logo-pingpong.webp";
import logoBabyFoot from "../../assets/games/logo-babyfoot.webp";
import logoRunning from "../../assets/games/logo-running-performance.webp";
import logoFitPerf from "../../assets/games/logo-fit-performance.webp";
import logoEsports from "../../assets/games/logo-esports.webp";
import logoMolkky from "../../assets/games/logo-molkky.png";
import logoDiceGame from "../../assets/games/logo-dicegame.webp";
import logoFoot from "../../assets/games/logo-foot.png";

export type TvSportId =
  | "darts"
  | "petanque"
  | "pingpong"
  | "babyfoot"
  | "molkky"
  | "dicegame"
  | "foot"
  | "running"
  | "fit"
  | "esports";

export type TvSportDef = {
  id: TvSportId;
  label: string;
  subtitle: string;
  logo: string;
  accent: string;
};

export type TvLaunchAction = {
  id: string;
  label: string;
  subtitle?: string;
  tab: string;
  params?: Record<string, any>;
  category?: string;
};

export const TV_SPORTS: readonly TvSportDef[] = [
  { id: "darts", label: "DARTS", subtitle: "Fléchettes", logo: logoDarts, accent: "#EEFF31" },
  { id: "petanque", label: "PÉTANQUE", subtitle: "Mènes & équipes", logo: logoPetanque, accent: "#D79A2B" },
  { id: "pingpong", label: "PING-PONG", subtitle: "Simple, double, training", logo: logoPingPong, accent: "#FF3FA4" },
  { id: "babyfoot", label: "BABY-FOOT", subtitle: "Matchs & défis", logo: logoBabyFoot, accent: "#248BFF" },
  { id: "molkky", label: "MÖLKKY", subtitle: "Classique & variantes", logo: logoMolkky, accent: "#F2C98F" },
  { id: "dicegame", label: "DICE GAME", subtitle: "Jeux de dés", logo: logoDiceGame, accent: "#9C6BFF" },
  { id: "foot", label: "FOOT", subtitle: "Formats football", logo: logoFoot, accent: "#72FF24" },
  { id: "running", label: "RUNNING PERF", subtitle: "Sorties & plans", logo: logoRunning, accent: "#FF7A00" },
  { id: "fit", label: "FIT PERF", subtitle: "Séances & programmes", logo: logoFitPerf, accent: "#F4B942" },
  { id: "esports", label: "E-SPORTS", subtitle: "Hub gaming", logo: logoEsports, accent: "#31D6FF" },
] as const;

const BY_ID = new Map<string, TvSportDef>(TV_SPORTS.map((sport) => [sport.id, sport]));

export function tvSportById(id: any): TvSportDef {
  return BY_ID.get(String(id || "").toLowerCase()) || TV_SPORTS[0];
}

const PETANQUE_ACTIONS: TvLaunchAction[] = [
  { id: "simple", label: "MATCH SIMPLE", subtitle: "1 contre 1", tab: "petanque_config", params: { mode: "simple", maxEndPoints: 3, meta: { kind: "teams", teams: 2, teamSize: 1 } } },
  { id: "ffa3", label: "MATCH À 3", subtitle: "Chacun pour soi", tab: "petanque_config", params: { mode: "ffa3", maxEndPoints: 3, meta: { kind: "ffa", players: 3 } } },
  { id: "doublette", label: "DOUBLETTE", subtitle: "2 contre 2", tab: "petanque_config", params: { mode: "doublette", maxEndPoints: 6, meta: { kind: "teams" } } },
  { id: "triplette", label: "TRIPLETTE", subtitle: "3 contre 3", tab: "petanque_config", params: { mode: "triplette", maxEndPoints: 6, meta: { kind: "teams" } } },
  { id: "tournament", label: "TOURNOIS", subtitle: "Compétitions pétanque", tab: "tournaments", params: { forceMode: "petanque" } },
];

const PINGPONG_ACTIONS: TvLaunchAction[] = [
  { id: "match_1v1", label: "1V1", tab: "pingpong_config", params: { mode: "match_1v1" } },
  { id: "match_2v2", label: "2V2", tab: "pingpong_config", params: { mode: "match_2v2" } },
  { id: "match_2v1", label: "2V1", tab: "pingpong_config", params: { mode: "match_2v1" } },
  { id: "tournante", label: "TOURNANTE", tab: "pingpong_config", params: { mode: "tournante" } },
  { id: "training", label: "TRAINING", tab: "pingpong_config", params: { mode: "training" } },
];

const BABYFOOT_ACTIONS: TvLaunchAction[] = [
  { id: "1v1", label: "MATCH 1V1", subtitle: "Classique", tab: "babyfoot_config", params: { mode: "match_1v1", meta: { kind: "teams", teams: 2, teamSizeA: 1, teamSizeB: 1 }, presetCategory: "match", presetVariantId: "match_1v1", presetMode: "1v1" } },
  { id: "2v2", label: "MATCH 2V2", subtitle: "Équipes de 2", tab: "babyfoot_config", params: { mode: "match_2v2", meta: { kind: "teams", teams: 2, teamSizeA: 2, teamSizeB: 2 }, presetCategory: "match", presetVariantId: "match_2v2", presetMode: "2v2" } },
  { id: "2v1", label: "MATCH 2V1", subtitle: "Asymétrique", tab: "babyfoot_config", params: { mode: "match_2v1", meta: { kind: "teams", teams: 2, teamSizeA: 2, teamSizeB: 1 }, presetCategory: "match", presetVariantId: "match_2v1", presetMode: "2v1" } },
  { id: "classic9", label: "CLASSIQUE 9", subtitle: "Fun", tab: "babyfoot_config", params: { presetCategory: "fun", presetVariantId: "classic9", presetMode: "1v1", presetTarget: 9 } },
  { id: "golden_goal", label: "GOLDEN GOAL", subtitle: "Premier but", tab: "babyfoot_config", params: { presetCategory: "fun", presetVariantId: "golden_goal", presetMode: "1v1", presetGoldenGoal: true, presetTarget: 1 } },
];

const MOLKKY_ACTIONS: TvLaunchAction[] = [
  { id: "classic", label: "CLASSIQUE", subtitle: "50 exact", tab: "molkky_config", params: { preset: "classic" } },
  { id: "fast", label: "RAPIDE", subtitle: "Partie courte", tab: "molkky_config", params: { preset: "fast" } },
  { id: "custom", label: "PERSONNALISÉ", subtitle: "Règles au choix", tab: "molkky_config", params: { preset: "custom" } },
];

const DICE_ACTIONS: TvLaunchAction[] = [
  { id: "duel", label: "DICE DUEL", subtitle: "2 dés · cible 100", tab: "dice_config", params: { preset: "duel" } },
  { id: "race", label: "DICE RACE", subtitle: "3 dés · cible 200", tab: "dice_config", params: { preset: "race" } },
  { id: "tenk", label: "10 000", subtitle: "6 dés", tab: "dice_config", params: { preset: "tenk" } },
  { id: "yams", label: "YAM'S", subtitle: "Scorecard", tab: "dice_yams_config" },
  { id: "farkle", label: "FARKLE", subtitle: "Push-your-luck", tab: "dice_farkle_config" },
  { id: "421", label: "421", subtitle: "Combinaisons", tab: "dice_421_config" },
  { id: "poker", label: "POKER DICE", subtitle: "Combinaisons poker", tab: "dice_poker_config" },
];

const FOOT_ACTIONS: TvLaunchAction[] = [
  { id: "penalty", label: "PENALTY", subtitle: "Tirs au but", tab: "foot_config", params: { format: "penalty" } },
  { id: "1v1", label: "1V1", tab: "foot_config", params: { format: "1v1" } },
  { id: "2v2", label: "2V2", tab: "foot_config", params: { format: "2v2" } },
  { id: "3v3", label: "3V3", tab: "foot_config", params: { format: "3v3" } },
  { id: "5v5", label: "FIVE", tab: "foot_config", params: { format: "5v5" } },
  { id: "7v7", label: "7V7", tab: "foot_config", params: { format: "7v7" } },
  { id: "8v8", label: "8V8", tab: "foot_config", params: { format: "8v8" } },
  { id: "11v11", label: "11V11", tab: "foot_config", params: { format: "11v11" } },
];

const RUNNING_ACTIONS: TvLaunchAction[] = [
  { id: "module", label: "RUNNING PERF", subtitle: "Tableau de bord", tab: "games" },
  { id: "plan", label: "PLAN D'ENTRAÎNEMENT", subtitle: "Programme running", tab: "running_plan" },
];

const FIT_ACTIONS: TvLaunchAction[] = [
  { id: "module", label: "FIT PERF", subtitle: "Bibliothèque & séances", tab: "games" },
  { id: "plan", label: "PROGRAMMES", subtitle: "Planification FIT", tab: "fit_plan" },
];

const ESPORTS_ACTIONS: TvLaunchAction[] = [
  { id: "hub", label: "E-SPORTS HUB", subtitle: "Accueil", tab: "games" },
  { id: "rooms", label: "SALONS", subtitle: "Rooms", tab: "esports_rooms" },
  { id: "matches", label: "MATCHS", subtitle: "Parties e-sport", tab: "esports_matches" },
  { id: "tournaments", label: "TOURNOIS", subtitle: "Compétitions", tab: "esports_tournaments" },
  { id: "stats", label: "STATS", subtitle: "Performances", tab: "esports_stats" },
];

export function tvLaunchActionsForSport(sportId: TvSportId): TvLaunchAction[] {
  if (sportId === "darts") {
    return DARTS_GAMES
      .filter((game) => game.ready && game.entry === "games")
      .slice()
      .sort((a, b) => (a.popularityRank ?? 999) - (b.popularityRank ?? 999) || a.label.localeCompare(b.label, "fr"))
      .map((game) => ({
        id: String(game.id),
        label: String(game.label),
        subtitle: game.category === "classic" ? "Classique" : game.category === "variant" ? "Variante" : game.category === "challenge" ? "Défi" : game.category === "fun" ? "Fun" : "Training",
        category: game.category,
        tab: String(game.tab),
        params: game.variantId
          ? { gameId: game.id, baseGame: game.baseGame, variantId: game.variantId }
          : undefined,
      }));
  }
  if (sportId === "petanque") return PETANQUE_ACTIONS;
  if (sportId === "pingpong") return PINGPONG_ACTIONS;
  if (sportId === "babyfoot") return BABYFOOT_ACTIONS;
  if (sportId === "molkky") return MOLKKY_ACTIONS;
  if (sportId === "dicegame") return DICE_ACTIONS;
  if (sportId === "foot") return FOOT_ACTIONS;
  if (sportId === "running") return RUNNING_ACTIONS;
  if (sportId === "fit") return FIT_ACTIONS;
  if (sportId === "esports") return ESPORTS_ACTIONS;
  return [];
}
