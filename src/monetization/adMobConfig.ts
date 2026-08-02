import publicAdMobConfig from "../../config/admob.public.json";
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
  interstitialReady: boolean;
  rewardedReady: boolean;
  appIdAndroid: string;
  bannerIdAndroid: string;
  bannerIdsAndroid: Record<AdPlacement, string>;
  interstitialIdAndroid: string;
  rewardedIdAndroid: string;
  testDeviceIds: string[];
  testDevicesManagedByAdMobConsole: boolean;
  realTestUseGoogleDemoBanners: boolean;
  consentDebugGeography: AdMobConsentDebugGeography;
  configErrors: string[];
};

type PublicAdMobConfig = {
  mode?: string;
  publisherId?: string;
  androidAppId?: string;
  androidBannerId?: string;
  androidBannerIds?: Partial<Record<AdPlacement, string>>;
  androidInterstitialId?: string;
  androidRewardedId?: string;
  testDeviceIds?: string[];
  testDevicesManagedByAdMobConsole?: boolean;
  realTestUseGoogleDemoBanners?: boolean;
  consentDebugGeography?: string;
};

const PUBLIC_CONFIG = publicAdMobConfig as PublicAdMobConfig;

const GOOGLE_ANDROID_TEST_IDS = {
  appId: "ca-app-pub-3940256099942544~3347511713",
  banner: "ca-app-pub-3940256099942544/9214589741",
  interstitial: "ca-app-pub-3940256099942544/1033173712",
  rewarded: "ca-app-pub-3940256099942544/5224354917",
} as const;

const BANNER_ENV_BY_PLACEMENT: Record<AdPlacement, string> = {
  home: "VITE_ADMOB_ANDROID_BANNER_HOME_ID",
  home_secondary: "VITE_ADMOB_ANDROID_BANNER_HOME_SECONDARY_ID",
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

function envBoolean(name: string): boolean | null {
  const raw = env(name).toLowerCase();
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return null;
}

function parseList(raw: string | string[] | undefined): string[] {
  const source = Array.isArray(raw) ? raw.join(",") : String(raw || "");
  return Array.from(new Set(
    source
      .split(/[;,\s]+/g)
      .map((value) => value.trim())
      .filter(Boolean)
  ));
}

function normalizeModeValue(value: string): AdMobMode | null {
  const explicit = String(value || "").trim().toLowerCase();
  if (explicit === "production" || explicit === "prod" || explicit === "live") return "production";
  if (explicit === "real_test" || explicit === "real-test" || explicit === "device_test" || explicit === "device-test") return "real_test";
  if (explicit === "google_test" || explicit === "google-test" || explicit === "demo" || explicit === "test") return "google_test";
  return null;
}

function normalizeMode(): AdMobMode {
  const fromEnv = normalizeModeValue(env("VITE_ADMOB_MODE"));
  if (fromEnv) return fromEnv;

  const fromPublicConfig = normalizeModeValue(PUBLIC_CONFIG.mode || "");
  if (fromPublicConfig) return fromPublicConfig;

  // Compatibilité avec le premier socle AdMob du projet.
  return env("VITE_ADMOB_TEST_MODE") === "0" ? "production" : "google_test";
}

function normalizeConsentDebugGeography(): AdMobConsentDebugGeography {
  const raw = String(
    env("VITE_ADMOB_CONSENT_DEBUG_GEOGRAPHY")
      || PUBLIC_CONFIG.consentDebugGeography
      || "DISABLED"
  ).toUpperCase().replace(/[-\s]/g, "_");
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

function realIdsFromConfiguration() {
  const genericBanner = env("VITE_ADMOB_ANDROID_BANNER_ID") || String(PUBLIC_CONFIG.androidBannerId || "").trim();
  const placementBanners = Object.fromEntries(
    (Object.entries(BANNER_ENV_BY_PLACEMENT) as [AdPlacement, string][]).map(([placement, variable]) => [
      placement,
      env(variable)
        || String(PUBLIC_CONFIG.androidBannerIds?.[placement] || "").trim()
        || genericBanner,
    ])
  ) as Record<AdPlacement, string>;

  return {
    appIdAndroid: env("VITE_ADMOB_ANDROID_APP_ID") || String(PUBLIC_CONFIG.androidAppId || "").trim(),
    bannerIdAndroid: genericBanner,
    bannerIdsAndroid: placementBanners,
    interstitialIdAndroid: env("VITE_ADMOB_ANDROID_INTERSTITIAL_ID") || String(PUBLIC_CONFIG.androidInterstitialId || "").trim(),
    rewardedIdAndroid: env("VITE_ADMOB_ANDROID_REWARDED_ID") || String(PUBLIC_CONFIG.androidRewardedId || "").trim(),
  };
}

function validateRealBannerIds(real: ReturnType<typeof realIdsFromConfiguration>): string[] {
  const errors: string[] = [];
  if (!isValidAdMobAndroidAppId(real.appIdAndroid)) errors.push("App ID AdMob Android manquant ou invalide.");
  if (!isValidAdMobAndroidAdUnitId(real.bannerIdAndroid)) errors.push("Bannière générique AdMob manquante ou invalide.");

  for (const [placement, adUnitId] of Object.entries(real.bannerIdsAndroid) as [AdPlacement, string][]) {
    if (!isValidAdMobAndroidAdUnitId(adUnitId)) {
      errors.push(`${BANNER_ENV_BY_PLACEMENT[placement]} manquant ou invalide.`);
    }
  }

  const publisher = publisherDigits(real.appIdAndroid);
  const realBannerUnits = [real.bannerIdAndroid, ...Object.values(real.bannerIdsAndroid)].filter(Boolean);
  if (publisher && realBannerUnits.some((id) => publisherDigits(id) !== publisher)) {
    errors.push("Toutes les bannières doivent appartenir au même compte éditeur que l'App ID AdMob.");
  }

  return errors;
}


/**
 * Trois modes sûrs :
 * - google_test : App ID + blocs de démonstration Google ; aucun revenu.
 * - real_test   : vrais IDs de bannières sur appareil déclaré dans AdMob. Tant
 *                 que les formats plein écran ne sont pas créés, leurs IDs de
 *                 démonstration Google restent utilisés.
 * - production  : App ID + bannières réels, aucun mode de test injecté. Les
 *                 formats plein écran restent désactivés jusqu'à la création
 *                 de leurs propres blocs AdMob réels.
 */
export function getAdMobRuntimeConfig(): AdMobRuntimeConfig {
  const requestedMode = normalizeMode();
  const real = realIdsFromConfiguration();
  const configErrors = requestedMode === "google_test" ? [] : validateRealBannerIds(real);

  if (requestedMode === "production") {
    // Les bannières peuvent être monétisées immédiatement avec leurs vrais IDs.
    // Les formats plein écran sont indépendants : tant que leurs blocs AdMob
    // n'existent pas, ils restent simplement désactivés au lieu de faire
    // retomber TOUTE la configuration sur les IDs de démonstration Google.
    if (real.interstitialIdAndroid && !isValidAdMobAndroidAdUnitId(real.interstitialIdAndroid)) {
      configErrors.push("Interstitiel AdMob de production invalide.");
    }
    if (real.rewardedIdAndroid && !isValidAdMobAndroidAdUnitId(real.rewardedIdAndroid)) {
      configErrors.push("Rewarded AdMob de production invalide.");
    }
    const publisher = publisherDigits(real.appIdAndroid);
    for (const [label, id] of [
      ["interstitiel", real.interstitialIdAndroid],
      ["rewarded", real.rewardedIdAndroid],
    ] as const) {
      if (id && publisher && publisherDigits(id) !== publisher) {
        configErrors.push(`Le bloc ${label} doit appartenir au même compte éditeur que l'App ID AdMob.`);
      }
    }
  } else if (requestedMode === "real_test") {
    if (real.interstitialIdAndroid && !isValidAdMobAndroidAdUnitId(real.interstitialIdAndroid)) {
      configErrors.push("Interstitiel AdMob de test invalide.");
    }
    if (real.rewardedIdAndroid && !isValidAdMobAndroidAdUnitId(real.rewardedIdAndroid)) {
      configErrors.push("Rewarded AdMob de test invalide.");
    }
  }

  const testDeviceIds = parseList(
    env("VITE_ADMOB_ANDROID_TEST_DEVICE_IDS") || PUBLIC_CONFIG.testDeviceIds || []
  );
  const consoleManagedFromEnv = envBoolean("VITE_ADMOB_TEST_DEVICES_MANAGED_BY_CONSOLE");
  const testDevicesManagedByAdMobConsole = consoleManagedFromEnv
    ?? Boolean(PUBLIC_CONFIG.testDevicesManagedByAdMobConsole);
  const demoBannersFromEnv = envBoolean("VITE_ADMOB_REAL_TEST_USE_GOOGLE_DEMO_BANNERS");
  // En real_test, les vrais IDs restent chargés et contrôlés par les guards de
  // release, mais les requêtes visuelles peuvent utiliser le bloc de démonstration
  // Google. Cela rend les tests FREE/PREMIUM déterministes : un bloc réel tout
  // juste créé ou non encore approuvé peut légitimement répondre NO_FILL (3).
  const realTestUseGoogleDemoBanners = requestedMode === "real_test"
    ? (demoBannersFromEnv ?? (PUBLIC_CONFIG.realTestUseGoogleDemoBanners !== false))
    : false;
  const consentDebugGeography = normalizeConsentDebugGeography();

  if (requestedMode === "real_test" && testDeviceIds.length === 0 && !testDevicesManagedByAdMobConsole) {
    configErrors.push("Déclare au moins un appareil de test dans AdMob ou renseigne VITE_ADMOB_ANDROID_TEST_DEVICE_IDS.");
  }

  const realConfigurationReady = configErrors.length === 0;
  const interstitialReady = isValidAdMobAndroidAdUnitId(real.interstitialIdAndroid);
  const rewardedReady = isValidAdMobAndroidAdUnitId(real.rewardedIdAndroid);
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
      interstitialReady: false,
      rewardedReady: false,
      appIdAndroid: GOOGLE_ANDROID_TEST_IDS.appId,
      bannerIdAndroid: GOOGLE_ANDROID_TEST_IDS.banner,
      bannerIdsAndroid: googleBanners,
      interstitialIdAndroid: GOOGLE_ANDROID_TEST_IDS.interstitial,
      rewardedIdAndroid: GOOGLE_ANDROID_TEST_IDS.rewarded,
      testDeviceIds,
      testDevicesManagedByAdMobConsole,
      realTestUseGoogleDemoBanners: true,
      consentDebugGeography,
      configErrors: Array.from(new Set(configErrors)),
    };
  }

  const interstitialIdAndroid = mode === "real_test" && !real.interstitialIdAndroid
    ? GOOGLE_ANDROID_TEST_IDS.interstitial
    : real.interstitialIdAndroid;
  const rewardedIdAndroid = mode === "real_test" && !real.rewardedIdAndroid
    ? GOOGLE_ANDROID_TEST_IDS.rewarded
    : real.rewardedIdAndroid;

  return {
    requestedMode,
    mode,
    testMode: mode === "real_test",
    usesGoogleDemoIds: false,
    usesRealAdUnitIds: true,
    // productionReady signifie ici : App ID + toutes les bannières réelles
    // sont prêtes à générer des impressions monétisables. Les formats plein
    // écran ont leur propre état et n'empêchent plus les bannières de passer live.
    productionReady: mode === "production" && realConfigurationReady,
    interstitialReady: mode === "real_test" || interstitialReady,
    rewardedReady: mode === "real_test" || rewardedReady,
    appIdAndroid: real.appIdAndroid,
    bannerIdAndroid: real.bannerIdAndroid,
    bannerIdsAndroid: real.bannerIdsAndroid,
    interstitialIdAndroid,
    rewardedIdAndroid,
    testDeviceIds: mode === "real_test" ? testDeviceIds : [],
    // Une déclaration dans la console AdMob reste valable même dans un build
    // production. Seule l'injection locale d'identifiants est supprimée.
    testDevicesManagedByAdMobConsole,
    realTestUseGoogleDemoBanners: mode === "real_test" && realTestUseGoogleDemoBanners,
    consentDebugGeography: mode === "real_test" ? consentDebugGeography : "DISABLED",
    configErrors: Array.from(new Set(configErrors)),
  };
}

export function getAdMobBannerId(placement: AdPlacement): string {
  const config = getAdMobRuntimeConfig();
  // Pour les tests fonctionnels Android, le bloc de démonstration Google est
  // volontairement privilégié. Google le configure spécifiquement pour renvoyer
  // des créations de test de façon fiable. Les vrais IDs restent néanmoins
  // présents, validés et seront automatiquement utilisés en production.
  if (config.mode === "google_test" || (config.mode === "real_test" && config.realTestUseGoogleDemoBanners)) {
    return GOOGLE_ANDROID_TEST_IDS.banner;
  }
  return config.bannerIdsAndroid[placement] || config.bannerIdAndroid;
}

export const ADMOB_ANDROID_GOOGLE_TEST_APP_ID = GOOGLE_ANDROID_TEST_IDS.appId;
export const ADMOB_ANDROID_GOOGLE_TEST_UNITS = {
  banner: GOOGLE_ANDROID_TEST_IDS.banner,
  interstitial: GOOGLE_ANDROID_TEST_IDS.interstitial,
  rewarded: GOOGLE_ANDROID_TEST_IDS.rewarded,
} as const;
