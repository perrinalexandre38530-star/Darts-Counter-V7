import { hasVerifiedProduct } from "../monetization/prefs";
import { STORE_PRODUCT_IDS } from "../monetization/productIds";
import type { ThemeId } from "./themePresets";

export const ARENAS_THEME_IDS = [
  "arenaDartsPub",
  "arenaChampionship",
  "arenaCyber",
  "arenaStreet",
  "arenaStadiumNight",
  "arenaLuxuryClub",
  "arenaRetroArcade",
  "arenaFireIce",
] as const satisfies readonly ThemeId[];

const ARENAS_THEME_SET = new Set<ThemeId>(ARENAS_THEME_IDS);

export function isArenasTheme(id: ThemeId | string | null | undefined): id is (typeof ARENAS_THEME_IDS)[number] {
  return ARENAS_THEME_SET.has(String(id || "") as ThemeId);
}

export function areArenasThemesUnlocked(): boolean {
  return hasVerifiedProduct(STORE_PRODUCT_IDS.themesArenas, STORE_PRODUCT_IDS.cosmeticsBundle);
}

export function canUseTheme(id: ThemeId): boolean {
  return !isArenasTheme(id) || areArenasThemesUnlocked();
}
