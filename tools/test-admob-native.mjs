#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const checks = [];
function check(label, ok) { checks.push([label, !!ok]); }

const config = read("src/monetization/adMobConfig.ts");
const native = read("src/monetization/nativeAdMob.ts");
const inlineTs = read("src/monetization/inlineAdMob.ts");
const slot = read("src/monetization/AdSlot.tsx");
const settings = read("src/monetization/MonetizationSettingsPanel.tsx");
const home = read("src/pages/Home.tsx");
const ticker = read("src/components/home/ArcadeTicker.tsx");
const mainActivity = read("android/app/src/main/java/com/multisportsscoring/app/MainActivity.java");
const inlineJava = read("android/app/src/main/java/com/multisportsscoring/app/InlineAdMobPlugin.java");
const appGradle = read("android/app/build.gradle");
const variablesGradle = read("android/variables.gradle");
const configure = read("tools/configure-android-admob.mjs");
const appAdsConfigure = read("tools/configure-app-ads.mjs");
const releaseGuard = read("tools/admob-release-check.mjs");
const envExample = read("env.example");

check("Google test banner ID", config.includes("ca-app-pub-3940256099942544/9214589741"));
check("Three explicit AdMob modes", config.includes('"google_test" | "real_test" | "production"'));
check("Invalid real config falls back to Google test", config.includes('mode: AdMobMode = requestedMode === "google_test" || !realConfigurationReady'));
check("Per-placement banner units supported", config.includes("BANNER_ENV_BY_PLACEMENT") && config.includes("getAdMobBannerId"));
check("Production IDs validated", config.includes("isValidAdMobAndroidAppId") && config.includes("isValidAdMobAndroidAdUnitId"));
check("Legacy floating banner remains disabled", native.includes("aucun banner AdMob natif") && native.includes("removeBanner"));
check("UMP is requested each initialization", native.includes("requestConsentInfo") && native.includes("showConsentForm"));
check("UMP debug is limited to non-production test modes", native.includes("config.testMode && config.testDeviceIds.length") && native.includes("testDeviceIdentifiers"));
check("Privacy options only open when required", native.includes("status.privacyOptionsRequired"));
check("Inline bridge uses dedicated Capacitor plugin", inlineTs.includes('registerPlugin("InlineAdMob")'));
check("Inline bridge waits for UMP consent", inlineTs.includes("ensureNativeAdMobReady") && inlineTs.includes("status.canRequestAds"));
check("Inline bridge resolves unit by placement", inlineTs.includes("getAdMobBannerId(placement)"));
check("React slots measure real DOM rectangles", slot.includes("getBoundingClientRect") && slot.includes("PaidInlineSurface"));
check("React slots pass placement to native bridge", slot.includes("showInlineGoogleAd(slotKey, placement, rect)"));
check("Home top has stable paid slot", home.includes('slotKey="home-top"'));
check("Home player has stable paid slot", home.includes('slotKey="home-player"'));
check("Darts Home title is DARTS SCORING", home.includes('return "DARTS SCORING"'));
check("Ticker inserts monetized ad slides", home.includes("monetizedAd: true"));
check("Ticker mounts paid surface", ticker.includes('slotKey="home-ticker"') && ticker.includes("PaidInlineSurface"));
check("Premium users do not receive paid inline ads", slot.includes("!premiumActive") && home.includes("!getVerifiedPremiumState().active"));
check("Settings expose runtime mode and config errors", settings.includes("Prêt production") && settings.includes("configErrors"));
check("MainActivity registers InlineAdMob plugin", mainActivity.includes("registerPlugin(InlineAdMobPlugin.class)"));
check("Android plugin creates real Google AdView", inlineJava.includes("new AdView") && inlineJava.includes("AdRequest.Builder"));
check("Android plugin uses inline adaptive banner size", inlineJava.includes("getInlineAdaptiveBannerAdSize"));
check("Android plugin follows WebView rectangle", inlineJava.includes("getWebViewOffset") && inlineJava.includes("leftMargin") && inlineJava.includes("topMargin"));
check("Android plugin configures test devices", inlineJava.includes("setTestDeviceIds") && inlineJava.includes("testDeviceIds"));
check("Android app exposes GMA SDK to custom plugin", appGradle.includes("com.google.android.gms:play-services-ads:"));
check("AdMob dependency pinned compatibly with plugin v8", variablesGradle.includes("playServicesAdsVersion = '24.9.0'"));
check("Android configurator understands real_test", configure.includes('mode === "real_test"'));
check("app-ads.txt generator writes Google seller line", appAdsConfigure.includes("f08c47fec0942fa0") && appAdsConfigure.includes("app-ads.txt"));
check("Production release guard checks app-ads.txt", releaseGuard.includes("public/app-ads.txt") && releaseGuard.includes("Aucun appareil de test"));
check("Environment template documents placement units", envExample.includes("VITE_ADMOB_ANDROID_BANNER_GAMES_ID") && envExample.includes("ADMOB_PUBLISHER_ID"));

const failed = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) console.log(`${ok ? "✅" : "❌"} ${label}`);
if (failed.length) {
  console.error(`\n❌ AdMob paid inline regression: ${checks.length - failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\n✅ AdMob paid inline regression: ${checks.length}/${checks.length}`);
