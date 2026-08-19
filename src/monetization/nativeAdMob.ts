import { ADMOB_ANDROID_GOOGLE_TEST_UNITS, getAdMobRuntimeConfig } from "./adMobConfig";
import { isCapacitorNativeRuntime } from "../lib/nativePlatform";
import { canRequestPaidAds, getVerifiedAdFreeState, loadMonetizationPrefs } from "./prefs";

export type NativeAdMobStatus = {
  native: boolean;
  pluginAvailable: boolean;
  initialized: boolean;
  canRequestAds: boolean;
  consentStatus: string;
  privacyOptionsRequired: boolean;
  testMode: boolean;
  mode: "google_test" | "real_test" | "production";
  usesGoogleDemoIds: boolean;
  productionReady: boolean;
  interstitialReady: boolean;
  rewardedReady: boolean;
  fullMonetizationReady: boolean;
  testDeviceCount: number;
  testDevicesManagedByAdMobConsole: boolean;
  realTestUseGoogleDemoBanners: boolean;
  configErrors: string[];
  error?: string;
};

export type NativeBannerPosition = "TOP_CENTER" | "CENTER" | "BOTTOM_CENTER";

export type NativeBannerOptions = {
  position?: NativeBannerPosition;
  margin?: number;
};

type AdMobPlugin = {
  initialize: (options?: any) => Promise<void>;
  requestConsentInfo: (options?: any) => Promise<any>;
  showConsentForm: () => Promise<any>;
  showPrivacyOptionsForm: () => Promise<void>;
  prepareInterstitial: (options: any) => Promise<any>;
  showInterstitial: (options?: any) => Promise<void>;
  prepareRewardVideoAd: (options: any) => Promise<any>;
  showRewardVideoAd: (options?: any) => Promise<any>;
  showBanner: (options: any) => Promise<void>;
  hideBanner?: () => Promise<void>;
  removeBanner: () => Promise<void>;
};

let pluginCache: AdMobPlugin | null | undefined;
let readyPromise: Promise<NativeAdMobStatus> | null = null;
let bannerSignature: string | null = null;

// Les pubs plein écran sont préchargées pour éviter d'attendre le réseau au moment
// où l'utilisateur quitte les résultats. Une pub préparée n'est jamais réutilisée
// après affichage : le SDK attend un nouveau chargement pour l'impression suivante.
let interstitialPreparedKey: string | null = null;
let interstitialPrepareKey: string | null = null;
let interstitialPreparePromise: Promise<boolean> | null = null;
let rewardedPreparedKey: string | null = null;
let rewardedPrepareKey: string | null = null;
let rewardedPreparePromise: Promise<boolean> | null = null;

function fullscreenKey(adId: string, isTesting: boolean): string {
  return `${adId}|${isTesting ? "test" : "live"}`;
}

function clearInterstitialCache(): void {
  interstitialPreparedKey = null;
  interstitialPrepareKey = null;
  interstitialPreparePromise = null;
}

function clearRewardedCache(): void {
  rewardedPreparedKey = null;
  rewardedPrepareKey = null;
  rewardedPreparePromise = null;
}

export function clearNativeFullscreenAdCache(): void {
  clearInterstitialCache();
  clearRewardedCache();
}

function getAdMobPlugin(): AdMobPlugin | null {
  if (pluginCache !== undefined) return pluginCache;
  if (typeof window === "undefined" || !isCapacitorNativeRuntime()) {
    pluginCache = null;
    return null;
  }

  try {
    const cap = (window as any).Capacitor;
    if (typeof cap?.registerPlugin === "function") {
      pluginCache = cap.registerPlugin("AdMob") as AdMobPlugin;
      return pluginCache;
    }
    pluginCache = cap?.Plugins?.AdMob || null;
    return pluginCache;
  } catch {
    pluginCache = null;
    return null;
  }
}

function baseStatus() {
  const config = getAdMobRuntimeConfig();
  return {
    testMode: config.testMode,
    mode: config.mode,
    usesGoogleDemoIds: config.usesGoogleDemoIds,
    productionReady: config.productionReady,
    interstitialReady: config.interstitialReady,
    rewardedReady: config.rewardedReady,
    fullMonetizationReady: config.fullMonetizationReady,
    testDeviceCount: config.testDeviceIds.length,
    testDevicesManagedByAdMobConsole: config.testDevicesManagedByAdMobConsole,
    realTestUseGoogleDemoBanners: config.realTestUseGoogleDemoBanners,
    configErrors: config.configErrors,
  } as const;
}

function unavailable(error?: string): NativeAdMobStatus {
  return {
    native: isCapacitorNativeRuntime(),
    pluginAvailable: false,
    initialized: false,
    canRequestAds: false,
    consentStatus: "UNKNOWN",
    privacyOptionsRequired: false,
    ...baseStatus(),
    ...(error ? { error } : {}),
  };
}

function consentDebugValue(value: string): number | undefined {
  if (value === "EEA") return 1;
  if (value === "NOT_EEA") return 2;
  return undefined;
}

async function performInitialization(): Promise<NativeAdMobStatus> {
  const plugin = getAdMobPlugin();
  const config = getAdMobRuntimeConfig();
  if (!plugin) return unavailable("Plugin AdMob natif indisponible. Lance android:bootstrap puis android:sync.");

  try {
    await plugin.initialize({
      initializeForTesting: config.mode === "real_test",
      testingDevices: config.mode === "real_test" ? config.testDeviceIds : [],
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });

    // Les banners natifs flottants sont volontairement désactivés dans MULTISPORTS SCORING.
    // Nettoie un éventuel banner resté attaché à l'Activity après un ancien build/reload.
    bannerSignature = null;
    try { await plugin.hideBanner?.(); } catch {}
    try { await plugin.removeBanner(); } catch {}

    const consentOptions: Record<string, unknown> = { tagForUnderAgeOfConsent: false };
    const debugGeography = consentDebugValue(config.consentDebugGeography);
    if (config.testMode && config.testDeviceIds.length) {
      consentOptions.testDeviceIdentifiers = config.testDeviceIds;
      if (debugGeography !== undefined) consentOptions.debugGeography = debugGeography;
    }

    let consent = await plugin.requestConsentInfo(consentOptions);
    if (!consent?.canRequestAds && consent?.isConsentFormAvailable) {
      consent = await plugin.showConsentForm();
    }

    return {
      native: true,
      pluginAvailable: true,
      initialized: true,
      canRequestAds: consent?.canRequestAds === true,
      consentStatus: String(consent?.status || "UNKNOWN"),
      privacyOptionsRequired: String(consent?.privacyOptionsRequirementStatus || "") === "REQUIRED",
      ...baseStatus(),
    };
  } catch (e: any) {
    return {
      native: true,
      pluginAvailable: true,
      initialized: false,
      canRequestAds: false,
      consentStatus: "UNKNOWN",
      privacyOptionsRequired: false,
      ...baseStatus(),
      error: String(e?.message || e || "Initialisation AdMob/UMP impossible"),
    };
  }
}

export function ensureNativeAdMobReady(forceRefresh = false): Promise<NativeAdMobStatus> {
  if (!isCapacitorNativeRuntime()) return Promise.resolve(unavailable());
  if (forceRefresh || !readyPromise) readyPromise = performInitialization();
  return readyPromise;
}

export async function getNativeAdMobStatus(forceRefresh = false): Promise<NativeAdMobStatus> {
  return ensureNativeAdMobReady(forceRefresh);
}

export async function showNativePrivacyOptions(): Promise<boolean> {
  const plugin = getAdMobPlugin();
  if (!plugin) return false;
  const status = await ensureNativeAdMobReady();
  if (!status.pluginAvailable || !status.privacyOptionsRequired) return false;
  try {
    await plugin.showPrivacyOptionsForm();
    readyPromise = performInitialization();
    await readyPromise;
    return true;
  } catch {
    return false;
  }
}

export async function preloadNativeInterstitial(forceGoogleTest = false): Promise<boolean> {
  if (!forceGoogleTest && (!canRequestPaidAds(loadMonetizationPrefs()) || getVerifiedAdFreeState().active)) {
    clearInterstitialCache();
    return false;
  }
  const plugin = getAdMobPlugin();
  if (!plugin) return false;
  const status = await ensureNativeAdMobReady();
  if (!status.canRequestAds) return false;
  const config = getAdMobRuntimeConfig();
  if (!forceGoogleTest && !config.interstitialReady) return false;
  const adId = forceGoogleTest ? ADMOB_ANDROID_GOOGLE_TEST_UNITS.interstitial : config.interstitialIdAndroid;
  if (!adId) return false;

  const isTesting = forceGoogleTest || config.testMode;
  const key = fullscreenKey(adId, isTesting);
  if (interstitialPreparedKey === key) return true;
  if (interstitialPreparePromise && interstitialPrepareKey === key) return interstitialPreparePromise;

  interstitialPrepareKey = key;
  interstitialPreparePromise = (async () => {
    try {
      await plugin.prepareInterstitial({ adId, isTesting, immersiveMode: true });
      if (!canRequestPaidAds(loadMonetizationPrefs()) || getVerifiedAdFreeState().active) {
        clearInterstitialCache();
        return false;
      }
      interstitialPreparedKey = key;
      return true;
    } catch {
      interstitialPreparedKey = null;
      return false;
    } finally {
      if (interstitialPrepareKey === key) {
        interstitialPrepareKey = null;
        interstitialPreparePromise = null;
      }
    }
  })();
  return interstitialPreparePromise;
}

export async function showNativeInterstitial(forceGoogleTest = false): Promise<boolean> {
  if (!forceGoogleTest && (!canRequestPaidAds(loadMonetizationPrefs()) || getVerifiedAdFreeState().active)) {
    clearInterstitialCache();
    return false;
  }
  const plugin = getAdMobPlugin();
  if (!plugin) return false;
  const config = getAdMobRuntimeConfig();
  if (!forceGoogleTest && !config.interstitialReady) return false;
  const adId = forceGoogleTest ? ADMOB_ANDROID_GOOGLE_TEST_UNITS.interstitial : config.interstitialIdAndroid;
  if (!adId) return false;
  const key = fullscreenKey(adId, forceGoogleTest || config.testMode);

  const prepared = interstitialPreparedKey === key || await preloadNativeInterstitial(forceGoogleTest);
  if (!prepared) return false;
  if (!forceGoogleTest && (!canRequestPaidAds(loadMonetizationPrefs()) || getVerifiedAdFreeState().active)) {
    clearInterstitialCache();
    return false;
  }

  try {
    await plugin.showInterstitial({ adId });
    return true;
  } finally {
    // Un interstitiel chargé est à usage unique. Le match suivant déclenchera
    // automatiquement un nouveau préchargement pendant ses résultats.
    clearInterstitialCache();
  }
}

export async function preloadNativeRewarded(forceGoogleTest = false): Promise<boolean> {
  if (!forceGoogleTest && (!canRequestPaidAds(loadMonetizationPrefs()) || getVerifiedAdFreeState().active)) {
    clearRewardedCache();
    return false;
  }
  const plugin = getAdMobPlugin();
  if (!plugin) return false;
  const status = await ensureNativeAdMobReady();
  if (!status.canRequestAds) return false;
  const config = getAdMobRuntimeConfig();
  if (!forceGoogleTest && !config.rewardedReady) return false;
  const adId = forceGoogleTest ? ADMOB_ANDROID_GOOGLE_TEST_UNITS.rewarded : config.rewardedIdAndroid;
  if (!adId) return false;

  const isTesting = forceGoogleTest || config.testMode;
  const key = fullscreenKey(adId, isTesting);
  if (rewardedPreparedKey === key) return true;
  if (rewardedPreparePromise && rewardedPrepareKey === key) return rewardedPreparePromise;

  rewardedPrepareKey = key;
  rewardedPreparePromise = (async () => {
    try {
      await plugin.prepareRewardVideoAd({ adId, isTesting, immersiveMode: true });
      if (!canRequestPaidAds(loadMonetizationPrefs()) || getVerifiedAdFreeState().active) {
        clearRewardedCache();
        return false;
      }
      rewardedPreparedKey = key;
      return true;
    } catch {
      rewardedPreparedKey = null;
      return false;
    } finally {
      if (rewardedPrepareKey === key) {
        rewardedPrepareKey = null;
        rewardedPreparePromise = null;
      }
    }
  })();
  return rewardedPreparePromise;
}

export async function showNativeRewarded(forceGoogleTest = false): Promise<any | null> {
  if (!forceGoogleTest && (!canRequestPaidAds(loadMonetizationPrefs()) || getVerifiedAdFreeState().active)) {
    clearRewardedCache();
    return null;
  }
  const plugin = getAdMobPlugin();
  if (!plugin) return null;
  const config = getAdMobRuntimeConfig();
  if (!forceGoogleTest && (!config.rewardedReady || !config.rewardedIdAndroid)) return null;
  const adId = forceGoogleTest ? ADMOB_ANDROID_GOOGLE_TEST_UNITS.rewarded : config.rewardedIdAndroid;
  if (!adId) return null;
  const key = fullscreenKey(adId, forceGoogleTest || config.testMode);

  const prepared = rewardedPreparedKey === key || await preloadNativeRewarded(forceGoogleTest);
  if (!prepared) return null;
  if (!forceGoogleTest && (!canRequestPaidAds(loadMonetizationPrefs()) || getVerifiedAdFreeState().active)) {
    clearRewardedCache();
    return null;
  }

  try {
    // Le plugin résout cette Promise avec l'AdMobRewardItem seulement quand
    // la récompense a réellement été gagnée. Le code appelant peut donc
    // attribuer le bonus uniquement après cette résolution.
    return await plugin.showRewardVideoAd({ adId });
  } finally {
    clearRewardedCache();
  }
}

export async function showNativeBanner(
  _placement: string,
  _options: NativeBannerOptions = {}
): Promise<boolean> {
  // IMPORTANT : aucun banner AdMob natif ne doit flotter au-dessus de la WebView.
  // Même si un ancien appel subsiste dans un bundle/cache, on supprime le banner
  // au lieu de l'afficher. Les pubs de type bandeau sont intégrées au layout React.
  const plugin = getAdMobPlugin();
  bannerSignature = null;
  if (!plugin) return false;
  try { await plugin.hideBanner?.(); } catch {}
  try { await plugin.removeBanner(); } catch {}
  return false;
}

export async function removeNativeBanner(): Promise<void> {
  const plugin = getAdMobPlugin();
  bannerSignature = null;
  if (!plugin) return;
  try { await plugin.removeBanner(); } catch {}
}
