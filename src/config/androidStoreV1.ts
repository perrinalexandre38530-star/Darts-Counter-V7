import { getRuntimePlatform } from "../lib/nativePlatform";

/**
 * Politique de publication Android Store V1.
 *
 * Elle ne supprime aucune fonctionnalité : le Web/PWA et le mode DEV gardent
 * l'intégralité du projet. La restriction s'applique uniquement dans la WebView
 * Android Capacitor afin que la première version publique n'expose que les
 * sports/modes validés pour le lancement.
 */
export const ANDROID_STORE_V1_SPORT_IDS = ["darts", "babyfoot", "petanque", "running", "fit"] as const;

export const ANDROID_STORE_V1_DARTS_GAME_IDS = [
  "x01",
  "cricket",
  "killer",
  "darts_poker",
  "cargo",
  "shanghai",
  "training_x01",
  "tour_horloge",
  "five_lives",
  "golf",
  "departements",
  "capital",
  "loterie",
  "attrape_moi",
  "killer_progressive",
  "baseball",
  "darts_firefighter",
] as const;

const SPORT_IDS = new Set<string>(ANDROID_STORE_V1_SPORT_IDS);
const DARTS_GAME_IDS = new Set<string>(ANDROID_STORE_V1_DARTS_GAME_IDS);

export function isAndroidStoreV1Runtime(): boolean {
  return getRuntimePlatform() === "android";
}


/**
 * E-SPORTS reste volontairement caché dans l'APK Android public tant que le
 * module n'est pas prêt. Le Web/PWA l'expose pour le développement.
 * Un build Android de preview peut l'activer explicitement avec
 * VITE_ENABLE_ESPORTS_ANDROID_PREVIEW=true sans modifier la whitelist Store.
 */
export function isEsportsEnabledForCurrentRuntime(): boolean {
  if (!isAndroidStoreV1Runtime()) return true;
  try {
    return String(import.meta.env.VITE_ENABLE_ESPORTS_ANDROID_PREVIEW || "").trim().toLowerCase() === "true";
  } catch {
    return false;
  }
}

export function isAndroidStoreV1SportAllowed(sportId: unknown): boolean {
  const id = String(sportId || "").toLowerCase().trim();
  if (id === "esports" && isEsportsEnabledForCurrentRuntime()) return true;
  return SPORT_IDS.has(id);
}

export function isAndroidStoreV1DartsGameAllowed(gameId: unknown): boolean {
  return DARTS_GAME_IDS.has(String(gameId || "").toLowerCase().trim());
}

export function filterSportsForCurrentRuntime<T extends { id: unknown }>(sports: readonly T[]): T[] {
  if (!isAndroidStoreV1Runtime()) return [...sports];
  return sports.filter((sport) => isAndroidStoreV1SportAllowed(sport.id));
}

export function filterDartsGamesForCurrentRuntime<T extends { id: unknown }>(games: readonly T[]): T[] {
  if (!isAndroidStoreV1Runtime()) return [...games];
  return games.filter((game) => isAndroidStoreV1DartsGameAllowed(game.id));
}

export function shouldHideOnlineMessagingForCurrentRuntime(): boolean {
  return isAndroidStoreV1Runtime();
}
