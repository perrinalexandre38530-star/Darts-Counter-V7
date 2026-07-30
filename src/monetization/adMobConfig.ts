import type { AdPlacement } from "./types";

export type AdMobMode = "google_test" | "real_test" | "production";
export type AdMobConsentDebugGeography = "DISABLED" | "EEA" | "NOT_EEA";

export type AdMobRuntimeConfig = {
  requestedMode: AdMobMode;
  mode: AdMobMode;
  testMode: boolean;
  usesGoogleDemoIds: boolean;
  usesRealAdUnitIds: boolean;
  productionReady: boolean;
  appIdAndroid: string;
  bannerIdAndroid: string;
  bannerIdsAndroid: Record<AdPlacement, string>;
  interstitialIdAndroid: string;
  rewardedIdAndroid: string;
  testDeviceIds: string[];
  consentDebugGeography: AdMobConsentDebugGeography;
  configErrors: string[];
};

const GOOGLE_ANDROID_TEST_IDS = {
  appId: "ca-app-pub-3940256099942544~3347511713",
  banner: "ca-app-pub-3940256099942544/9214589741",
  interstitial: "ca-app-pub-3940256099942544/1033173712",
  rewarded: "ca-app-pub-3940256099942544/5224354917",
} as const;

const BANNER_ENV_BY_PLACEMENT: Record<AdPlacement, string> = {
  home: "VITE_ADMOB_ANDROID_BANNER_HOME_ID",
  messages: "VITE_ADMOB_ANDROID_BANNER_MESSAGES_ID",
  profiles: "VITE_ADMOB_ANDROID_BANNER_PROFILES_ID",
  games: "VITE_ADMOB_ANDROID_BANNER_GAMES_ID",
  competitions: "VITE_ADMOB_ANDROID_BANNER_COMPETITIONS_ID",
  online: "VITE_ADMOB_ANDROID_BANNER_ONLINE_ID",
  stats: "VITE_ADMOB_ANDROID_BANNER_STATS_ID",
  history: "VITE_ADMOB_ANDROID_BANNER_HISTORY_ID",
  settings: "VITE_ADMOB_ANDROID_BANNER_SETTINGS_ID",
  screens: "VITE_ADMOB_ANDROID_BANNER_SCREENS_ID",
};

function env(name: string): string {
  try {
    return String((import.meta as any)?.env?.[name] || "").trim();
  } catch {
    return "";
  }
}

function parseList(raw: string): string[] {
  return Array.from(new Set(
    String(raw || "")
      .split(/[;,\s]+/g)
      .map((value) => value.trim())
      .filter(Boolean)
  ));
}

function normalizeMode(): AdMobMode {
  const explicit = env("VITE_ADMOB_MODE").toLowerCase();
  if (explicit === "production" || explicit === "prod" || explicit === "live") return "production";
  if (explicit === "real_test" || explicit === "real-test" || explicit === "device_test" || explicit === "device-test") return "real_test";
  if (explicit === "google_test" || explicit === "google-test" || explicit === "demo" || explicit === "test") return "google_test";

  // Compatibilité avec le premier socle AdMob du projet.
  return env("VITE_ADMOB_TEST_MODE") === "0" ? "production" : "google_test";
}

function normalizeConsentDebugGeography(): AdMobConsentDebugGeography {
  const raw = env("VITE_ADMOB_CONSENT_DEBUG_GEOGRAPHY").toUpperCase().replace(/[-\s]/g, "_");
  if (raw === "EEA") return "EEA";
  if (raw === "NOT_EEA" || raw === "NONEEA") return "NOT_EEA";
  return "DISABLED";
}

export function isValidAdMobAndroidAppId(value: string): boolean {
  return /^ca-app-pub-\d{16}~\d{10}$/.test(String(value || "").trim());
}

export function isValidAdMobAndroidAdUnitId(value: string): boolean {
  return /^ca-app-pub-\d{16}\/\d{10}$/.test(String(value || "").trim());
}

function publisherDigits(value: string): string {
  return String(value || "").match(/^ca-app-pub-(\d{16})[~/]/)?.[1] || "";
}

function realIdsFromEnvironment() {
  const genericBanner = env("VITE_ADMOB_ANDROID_BANNER_ID");
  const placementBanners = Object.fromEntries(
    (Object.entries(BANNER_ENV_BY_PLACEMENT) as [AdPlacement, string][]).map(([placement, variable]) => [
      placement,
      env(variable) || genericBanner,
    ])
  ) as Record<AdPlacement, string>;

  return {
    appIdAndroid: env("VITE_ADMOB_ANDROID_APP_ID"),
    bannerIdAndroid: genericBanner,
    bannerIdsAndroid: placementBanners,
    interstitialIdAndroid: env("VITE_ADMOB_ANDROID_INTERSTITIAL_ID"),
    rewardedIdAndroid: env("VITE_ADMOB_ANDROID_REWARDED_ID"),
  };
}

function validateRealIds(real: ReturnType<typeof realIdsFromEnvironment>): string[] {
  const errors: string[] = [];
  if (!isValidAdMobAndroidAppId(real.appIdAndroid)) errors.push("VITE_ADMOB_ANDROID_APP_ID manquant ou invalide.");
  if (!isValidAdMobAndroidAdUnitId(real.bannerIdAndroid)) errors.push("VITE_ADMOB_ANDROID_BANNER_ID manquant ou invalide.");
  if (!isValidAdMobAndroidAdUnitId(real.interstitialIdAndroid)) errors.push("VITE_ADMOB_ANDROID_INTERSTITIAL_ID manquant ou invalide.");
  if (!isValidAdMobAndroidAdUnitId(real.rewardedIdAndroid)) errors.push("VITE_ADMOB_ANDROID_REWARDED_ID manquant ou invalide.");

  for (const [placement, adUnitId] of Object.entries(real.bannerIdsAndroid) as [AdPlacement, string][]) {
    if (adUnitId && !isValidAdMobAndroidAdUnitId(adUnitId)) {
      errors.push(`${BANNER_ENV_BY_PLACEMENT[placement]} invalide.`);
    }
  }

  const publisher = publisherDigits(real.appIdAndroid);
  const allUnits = [
    real.bannerIdAndroid,
    real.interstitialIdAndroid,
    real.rewardedIdAndroid,
    ...Object.values(real.bannerIdsAndroid),
  ].filter(Boolean);
  if (publisher && allUnits.some((id) => publisherDigits(id) !== publisher)) {
    errors.push("Tous les blocs publicitaires doivent appartenir au même compte éditeur que l'App ID AdMob.");
  }

  return Array.from(new Set(errors));
}

/**
 * Trois modes sûrs :
 * - google_test : App ID + blocs de démonstration Google ; aucun revenu.
 * - real_test   : vrais IDs AdMob, mais uniquement sur des appareils de test déclarés.
 * - production  : vrais IDs, aucun appareil de test injecté dans le build public.
 *
 * Si une configuration réelle est incomplète, le runtime retombe volontairement
 * sur les IDs Google de démonstration. Le contrôle de release bloque ensuite un
 * AAB de production tant que les valeurs ne sont pas complètes.
 */
export function getAdMobRuntimeConfig(): AdMobRuntimeConfig {
  const requestedMode = normalizeMode();
  const real = realIdsFromEnvironment();
  const configErrors = requestedMode === "google_test" ? [] : validateRealIds(real);
  const testDeviceIds = parseList(env("VITE_ADMOB_ANDROID_TEST_DEVICE_IDS"));
  const consentDebugGeography = normalizeConsentDebugGeography();

  if (requestedMode === "real_test" && testDeviceIds.length === 0) {
    configErrors.push("VITE_ADMOB_ANDROID_TEST_DEVICE_IDS est obligatoire en mode real_test sur un téléphone physique.");
  }

  const realConfigurationReady = configErrors.length === 0;
  const mode: AdMobMode = requestedMode === "google_test" || !realConfigurationReady
    ? "google_test"
    : requestedMode;

  const googleBanners = Object.fromEntries(
    (Object.keys(BANNER_ENV_BY_PLACEMENT) as AdPlacement[]).map((placement) => [placement, GOOGLE_ANDROID_TEST_IDS.banner])
  ) as Record<AdPlacement, string>;

  if (mode === "google_test") {
    return {
      requestedMode,
      mode,
      testMode: true,
      usesGoogleDemoIds: true,
      usesRealAdUnitIds: false,
      productionReady: false,
      appIdAndroid: GOOGLE_ANDROID_TEST_IDS.appId,
      bannerIdAndroid: GOOGLE_ANDROID_TEST_IDS.banner,
      bannerIdsAndroid: googleBanners,
      interstitialIdAndroid: GOOGLE_ANDROID_TEST_IDS.interstitial,
      rewardedIdAndroid: GOOGLE_ANDROID_TEST_IDS.rewarded,
      testDeviceIds,
      consentDebugGeography,
      configErrors,
    };
  }

  return {
    requestedMode,
    mode,
    testMode: mode === "real_test",
    usesGoogleDemoIds: false,
    usesRealAdUnitIds: true,
    productionReady: mode === "production" && realConfigurationReady,
    ...real,
    testDeviceIds: mode === "real_test" ? testDeviceIds : [],
    consentDebugGeography: mode === "real_test" ? consentDebugGeography : "DISABLED",
    configErrors,
  };
}

export function getAdMobBannerId(placement: AdPlacement): string {
  const config = getAdMobRuntimeConfig();
  return config.bannerIdsAndroid[placement] || config.bannerIdAndroid;
}

export const ADMOB_ANDROID_GOOGLE_TEST_APP_ID = GOOGLE_ANDROID_TEST_IDS.appId;
export const ADMOB_ANDROID_GOOGLE_TEST_UNITS = {
  banner: GOOGLE_ANDROID_TEST_IDS.banner,
  interstitial: GOOGLE_ANDROID_TEST_IDS.interstitial,
  rewarded: GOOGLE_ANDROID_TEST_IDS.rewarded,
} as const;
