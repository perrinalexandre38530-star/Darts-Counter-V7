import { ADMOB_ANDROID_GOOGLE_TEST_UNITS, getAdMobRuntimeConfig } from "./adMobConfig";
import { isCapacitorNativeRuntime } from "../lib/nativePlatform";

export type NativeAdMobStatus = {
  native: boolean;
  pluginAvailable: boolean;
  initialized: boolean;
  canRequestAds: boolean;
  consentStatus: string;
  privacyOptionsRequired: boolean;
  testMode: boolean;
  error?: string;
};

type AdMobPlugin = {
  initialize: (options?: any) => Promise<void>;
  requestConsentInfo: (options?: any) => Promise<any>;
  showConsentForm: () => Promise<any>;
  showPrivacyOptionsForm: () => Promise<void>;
  prepareInterstitial: (options: any) => Promise<any>;
  showInterstitial: () => Promise<void>;
  prepareRewardVideoAd: (options: any) => Promise<any>;
  showRewardVideoAd: () => Promise<any>;
  showBanner: (options: any) => Promise<void>;
  hideBanner?: () => Promise<void>;
  removeBanner: () => Promise<void>;
};

let pluginCache: AdMobPlugin | null | undefined;
let readyPromise: Promise<NativeAdMobStatus> | null = null;
let bannerPlacement: string | null = null;

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

function unavailable(error?: string): NativeAdMobStatus {
  return {
    native: isCapacitorNativeRuntime(),
    pluginAvailable: false,
    initialized: false,
    canRequestAds: false,
    consentStatus: "UNKNOWN",
    privacyOptionsRequired: false,
    testMode: getAdMobRuntimeConfig().testMode,
    ...(error ? { error } : {}),
  };
}

async function performInitialization(): Promise<NativeAdMobStatus> {
  const plugin = getAdMobPlugin();
  const config = getAdMobRuntimeConfig();
  if (!plugin) return unavailable("Plugin AdMob natif indisponible. Lance android:bootstrap puis android:sync.");

  try {
    await plugin.initialize({ initializeForTesting: config.testMode });

    // UMP : requestConsentInfo DOIT précéder toute décision de chargement pub.
    let consent = await plugin.requestConsentInfo({ tagForUnderAgeOfConsent: false });
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
      testMode: config.testMode,
    };
  } catch (e: any) {
    return {
      native: true,
      pluginAvailable: true,
      initialized: false,
      canRequestAds: false,
      consentStatus: "UNKNOWN",
      privacyOptionsRequired: false,
      testMode: config.testMode,
      error: String(e?.message || e || "Initialisation AdMob/UMP impossible"),
    };
  }
}

export function ensureNativeAdMobReady(forceRefresh = false): Promise<NativeAdMobStatus> {
  if (!isCapacitorNativeRuntime()) return Promise.resolve(unavailable());
  if (forceRefresh || !readyPromise) readyPromise = performInitialization();
  return readyPromise;
}

export async function getNativeAdMobStatus(): Promise<NativeAdMobStatus> {
  return ensureNativeAdMobReady();
}

export async function showNativePrivacyOptions(): Promise<boolean> {
  const plugin = getAdMobPlugin();
  if (!plugin) return false;
  const status = await ensureNativeAdMobReady();
  if (!status.pluginAvailable) return false;
  try {
    await plugin.showPrivacyOptionsForm();
    readyPromise = performInitialization();
    await readyPromise;
    return true;
  } catch {
    return false;
  }
}

export async function showNativeInterstitial(forceGoogleTest = false): Promise<boolean> {
  const plugin = getAdMobPlugin();
  if (!plugin) return false;
  const status = await ensureNativeAdMobReady();
  if (!status.canRequestAds) return false;
  const config = getAdMobRuntimeConfig();
  await plugin.prepareInterstitial({
    adId: forceGoogleTest ? ADMOB_ANDROID_GOOGLE_TEST_UNITS.interstitial : config.interstitialIdAndroid,
    isTesting: forceGoogleTest || config.testMode,
    immersiveMode: true,
  });
  await plugin.showInterstitial();
  return true;
}

export async function showNativeRewarded(): Promise<any | null> {
  const plugin = getAdMobPlugin();
  if (!plugin) return null;
  const status = await ensureNativeAdMobReady();
  if (!status.canRequestAds) return null;
  const config = getAdMobRuntimeConfig();
  await plugin.prepareRewardVideoAd({
    adId: config.rewardedIdAndroid,
    isTesting: config.testMode,
    immersiveMode: true,
  });
  return plugin.showRewardVideoAd();
}

export async function showNativeBanner(placement: string): Promise<boolean> {
  const plugin = getAdMobPlugin();
  if (!plugin) return false;
  const status = await ensureNativeAdMobReady();
  if (!status.canRequestAds) return false;
  if (bannerPlacement === placement) return true;

  const config = getAdMobRuntimeConfig();
  try { await plugin.removeBanner(); } catch {}
  await plugin.showBanner({
    adId: config.bannerIdAndroid,
    adSize: "ADAPTIVE_BANNER",
    position: "BOTTOM_CENTER",
    // BottomNav fait ~64-72 px. La pub reste donc au-dessus de la navigation.
    margin: 76,
    isTesting: config.testMode,
  });
  bannerPlacement = placement;
  return true;
}

export async function removeNativeBanner(): Promise<void> {
  const plugin = getAdMobPlugin();
  bannerPlacement = null;
  if (!plugin) return;
  try { await plugin.removeBanner(); } catch {}
}
