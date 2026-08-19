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


export const FACTORY_THEME_IDS = [
  "factoryArgentSatine",
  "factoryDegradeGraphite",
  "factoryAtelierGrunge",
  "factoryPlaquesDecoupees",
  "factoryLamesMetal",
  "factoryAcierFissure",
  "factoryAcierRaye",
  "factoryToleGivree",
  "factoryBrossagePro",
  "factoryBrumeArgent",
  "factoryMurIndustriel",
] as const satisfies readonly ThemeId[];

export const PUB_THEME_IDS = [
  "pubBoisViolet",
  "pubSceneAmbree",
  "pubComptoirVintage",
] as const satisfies readonly ThemeId[];

export const GRAFFITI_THEME_IDS = [
  "graffitiTagsNocturnes",
  "graffitiEclatCyan",
  "graffitiMurPop",
  "graffitiRuelle",
  "graffitiExplosionBlanche",
  "graffitiRougeUnderground",
] as const satisfies readonly ThemeId[];

export const ARCADE_THEME_IDS = [
  "arcadePixelRose",
  "arcadeNeonPixels",
  "arcadePortailBleu",
  "arcadeVioletMatrix",
] as const satisfies readonly ThemeId[];

export const STREET_THEME_IDS = [
  "streetRouteUrbex",
  "streetMurStreetArt",
  "streetAcierUrbain",
  "streetPisteColors",
] as const satisfies readonly ThemeId[];

export const PRESTIGE_THEME_IDS = [
  "prestigeDiamantPur",
  "prestigeDiamantBrume",
  "prestigeDiamantRose",
  "prestigeQuartzDore",
  "prestigeSaphirCristal",
  "prestigeEmeraudeRoyale",
  "prestigeEmeraudeLumiere",
  "prestigeOrPatine",
  "prestigeOrVelours",
  "prestigeOrSoie",
  "prestigeOrBrut",
  "prestigeOrFusion",
  "prestigeOrFacettes",
  "prestigeSaphirRoyal",
  "prestigeSaphirNuit",
] as const satisfies readonly ThemeId[];

export const ABSTRACT_THEME_IDS = [
  "abstractGreenSplash",
  "abstractVioletInk",
  "abstractOrangeRugged",
  "abstractVioletMur",
  "abstractOrangeFusion",
  "abstractOrangeFlare",
  "abstractGreenBurst",
  "abstractOrangeObsidian",
  "abstractAmberStorm",
  "abstractWatercolor",
  "abstractPurpleGrunge",
  "abstractIceRed",
  "abstractPatina",
  "abstractSolarDust",
  "abstractCrimsonIce",
  "abstractSolarGlow",
  "abstractOxydBlue",
  "abstractOliveCanvas",
  "abstractSpectrumDust",
  "abstractTurquoiseRust",
  "abstractVioletPoster",
  "abstractPurpleNebula",
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
  ...FACTORY_THEME_IDS,
  ...PUB_THEME_IDS,
  ...GRAFFITI_THEME_IDS,
  ...ARCADE_THEME_IDS,
  ...STREET_THEME_IDS,
  ...PRESTIGE_THEME_IDS,
  ...ABSTRACT_THEME_IDS,
] as const satisfies readonly ThemeId[];

const ARENAS_THEME_SET = new Set<ThemeId>(ARENAS_THEME_IDS);
const PREMIUM_THEME_SET = new Set<ThemeId>(PREMIUM_THEME_IDS);

export function isArenasTheme(id: ThemeId | string | null | undefined): id is (typeof ARENAS_THEME_IDS)[number] {
  return ARENAS_THEME_SET.has(String(id || "") as ThemeId);
}

export function isPremiumTheme(id: ThemeId | string | null | undefined): id is (typeof PREMIUM_THEME_IDS)[number] {
  return PREMIUM_THEME_SET.has(String(id || "") as ThemeId);
}

const DEV_FORCE_PREMIUM_THEME_ACCESS = true;
const PREMIUM_THEME_TEST_KEY = "mss_force_premium_themes";

function hasLocalPremiumThemeOverride(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const raw = window.localStorage.getItem(PREMIUM_THEME_TEST_KEY);
    return raw === "1" || raw === "true";
  } catch {
    return false;
  }
}

export function arePremiumThemesUnlocked(): boolean {
  if (DEV_FORCE_PREMIUM_THEME_ACCESS || hasLocalPremiumThemeOverride()) return true;
  return hasVerifiedProduct(STORE_PRODUCT_IDS.themesArenas, STORE_PRODUCT_IDS.cosmeticsBundle);
}

export const areArenasThemesUnlocked = arePremiumThemesUnlocked;

export function canUseTheme(id: ThemeId): boolean {
  return !isPremiumTheme(id) || arePremiumThemesUnlocked();
}
