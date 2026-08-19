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


export const MATERIALS_THEME_IDS = [
  "materialBoisNoble",
  "materialMarbreVert",
  "materialCuivreFondu",
] as const satisfies readonly ThemeId[];

export const METALS_THEME_IDS = [
  "metalAluminiumPro",
  "metalAcierBrosse",
  "metalTitaneForge",
] as const satisfies readonly ThemeId[];

export const EXTREMES_THEME_IDS = [
  "extremeLavaCore",
  "extremeFireGlace",
  "extremeArcticPulse",
] as const satisfies readonly ThemeId[];

export const LUXE_THEME_IDS = [
  "luxePlatineRoyale",
  "luxeOrDiamant",
  "luxeEmeraudeNoire",
] as const satisfies readonly ThemeId[];

export const PREMIUM_THEME_IDS = [
  ...ARENAS_THEME_IDS,
  ...MATERIALS_THEME_IDS,
  ...METALS_THEME_IDS,
  ...EXTREMES_THEME_IDS,
  ...LUXE_THEME_IDS,
] as const satisfies readonly ThemeId[];

const ARENAS_THEME_SET = new Set<ThemeId>(ARENAS_THEME_IDS);
const PREMIUM_THEME_SET = new Set<ThemeId>(PREMIUM_THEME_IDS);

export function isArenasTheme(id: ThemeId | string | null | undefined): id is (typeof ARENAS_THEME_IDS)[number] {
  return ARENAS_THEME_SET.has(String(id || "") as ThemeId);
}

export function isPremiumTheme(id: ThemeId | string | null | undefined): id is (typeof PREMIUM_THEME_IDS)[number] {
  return PREMIUM_THEME_SET.has(String(id || "") as ThemeId);
}

export function arePremiumThemesUnlocked(): boolean {
  return hasVerifiedProduct(STORE_PRODUCT_IDS.themesArenas, STORE_PRODUCT_IDS.cosmeticsBundle);
}

export const areArenasThemesUnlocked = arePremiumThemesUnlocked;

export function canUseTheme(id: ThemeId): boolean {
  return !isPremiumTheme(id) || arePremiumThemesUnlocked();
}
