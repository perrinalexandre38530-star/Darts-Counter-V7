export const GAMEPLAY_ROUTE_STATE_EVENT = "msc:gameplay-route-state";

const GAMEPLAY_ROUTE_ALIASES = new Set<string>([
  // Core / legacy darts gameplay routes that do not use the *_play suffix.
  "x01",
  "cricket",
  "training_clock",
  "training_mode",
  "x01_device_camera",

  // Active scoring/training screens with historical route names.
  "pingpong_training",
  "petanque_tournament_match_score",
  "tournament_match_play",
]);

/**
 * Single source of truth for every route that represents an active game,
 * scoring session or training session. Navigation background music must never
 * be audible on one of these routes.
 */
export function isGameplayRouteName(routeLike: unknown): boolean {
  const routeName = String(routeLike || "").trim().toLowerCase();
  if (!routeName) return false;
  if (GAMEPLAY_ROUTE_ALIASES.has(routeName)) return true;
  return (
    routeName.endsWith("_play") ||
    routeName.endsWith(".play") ||
    routeName.includes("_play_")
  );
}

export type GameplayRouteStateDetail = {
  route: string;
  gameplay: boolean;
};

/**
 * Publishes the route state before React has rendered the destination screen.
 * This lets persistent audio stop synchronously on the same navigation action
 * that launches a game, rather than one render later.
 */
export function publishGameplayRouteState(routeLike: unknown): GameplayRouteStateDetail {
  const route = String(routeLike || "").trim();
  const detail: GameplayRouteStateDetail = {
    route,
    gameplay: isGameplayRouteName(route),
  };

  if (typeof document !== "undefined") {
    document.documentElement.dataset.mscGameplay = detail.gameplay ? "1" : "0";
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<GameplayRouteStateDetail>(GAMEPLAY_ROUTE_STATE_EVENT, { detail }));
  }
  return detail;
}
