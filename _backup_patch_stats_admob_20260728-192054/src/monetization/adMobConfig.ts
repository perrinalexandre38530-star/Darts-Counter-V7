export type AdMobRuntimeConfig = {
  testMode: boolean;
  appIdAndroid: string;
  bannerIdAndroid: string;
  interstitialIdAndroid: string;
  rewardedIdAndroid: string;
};

const GOOGLE_ANDROID_TEST_IDS = {
  appId: "ca-app-pub-3940256099942544~3347511713",
  banner: "ca-app-pub-3940256099942544/6300978111",
  interstitial: "ca-app-pub-3940256099942544/1033173712",
  rewarded: "ca-app-pub-3940256099942544/5224354917",
} as const;

function env(name: string): string {
  try {
    return String((import.meta as any)?.env?.[name] || "").trim();
  } catch {
    return "";
  }
}

/**
 * Sécurité RC : tant que VITE_ADMOB_TEST_MODE n'est pas explicitement "0",
 * MULTISPORTS SCORING utilise uniquement les identifiants de démonstration Google.
 */
export function getAdMobRuntimeConfig(): AdMobRuntimeConfig {
  const productionRequested = env("VITE_ADMOB_TEST_MODE") === "0";
  const productionIds = {
    appIdAndroid: env("VITE_ADMOB_ANDROID_APP_ID"),
    bannerIdAndroid: env("VITE_ADMOB_ANDROID_BANNER_ID"),
    interstitialIdAndroid: env("VITE_ADMOB_ANDROID_INTERSTITIAL_ID"),
    rewardedIdAndroid: env("VITE_ADMOB_ANDROID_REWARDED_ID"),
  };
  const productionComplete = Object.values(productionIds).every(Boolean);
  const testMode = !productionRequested || !productionComplete;

  return testMode
    ? {
        testMode: true,
        appIdAndroid: GOOGLE_ANDROID_TEST_IDS.appId,
        bannerIdAndroid: GOOGLE_ANDROID_TEST_IDS.banner,
        interstitialIdAndroid: GOOGLE_ANDROID_TEST_IDS.interstitial,
        rewardedIdAndroid: GOOGLE_ANDROID_TEST_IDS.rewarded,
      }
    : { testMode: false, ...productionIds };
}

export const ADMOB_ANDROID_GOOGLE_TEST_APP_ID = GOOGLE_ANDROID_TEST_IDS.appId;
export const ADMOB_ANDROID_GOOGLE_TEST_UNITS = {
  banner: GOOGLE_ANDROID_TEST_IDS.banner,
  interstitial: GOOGLE_ANDROID_TEST_IDS.interstitial,
  rewarded: GOOGLE_ANDROID_TEST_IDS.rewarded,
} as const;
