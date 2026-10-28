import type { SportId } from "../contexts/SportContext";

/**
 * Sports currently wired to the LIVE SPORTS hub in the runtime app.
 * Keep this list restricted to sports that really exist in SportContext.
 * Future catalog sources may already exist, but they must not leak into the UI
 * until the corresponding sport is actually selectable in the application.
 */
export type LiveSportsAppId = Extract<SportId, "darts" | "petanque" | "pingpong" | "babyfoot" | "molkky" | "foot">;

export const LIVE_SPORTS_APP_ORDER: LiveSportsAppId[] = [
  "darts",
  "petanque",
  "pingpong",
  "babyfoot",
  "molkky",
  "foot",
];

const LIVE_SPORTS_APP_SET = new Set<LiveSportsAppId>(LIVE_SPORTS_APP_ORDER);

export function isLiveSportsSupportedSport(value: unknown): value is LiveSportsAppId {
  return LIVE_SPORTS_APP_SET.has(String(value || "").toLowerCase() as LiveSportsAppId);
}
