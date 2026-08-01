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
const home = read("src/pages/Home.tsx");
const ticker = read("src/components/home/ArcadeTicker.tsx");
const mainActivity = read("android/app/src/main/java/com/multisportsscoring/app/MainActivity.java");
const inlineJava = read("android/app/src/main/java/com/multisportsscoring/app/InlineAdMobPlugin.java");
const appGradle = read("android/app/build.gradle");
const variablesGradle = read("android/variables.gradle");
const configure = read("tools/configure-android-admob.mjs");

check("Google test banner ID", config.includes("ca-app-pub-3940256099942544/9214589741"));

check(
  "Production mode validates all required real IDs",
  config.includes("validateRealBannerIds")
    && config.includes("validateProductionFullscreenIds")
    && config.includes('requestedMode === "production"')
    && config.includes('productionReady: mode === "production" && realConfigurationReady')
);

check("Legacy floating banner remains disabled", native.includes("aucun banner AdMob natif") && native.includes("removeBanner"));
check("Inline bridge uses dedicated Capacitor plugin", inlineTs.includes('registerPlugin("InlineAdMob")'));
check("Inline bridge waits for UMP consent", inlineTs.includes("ensureNativeAdMobReady") && inlineTs.includes("status.canRequestAds"));
check("React slots measure real DOM rectangles", slot.includes("getBoundingClientRect") && slot.includes("PaidInlineSurface"));
check("React inline slots use paid Google bridge", slot.includes("showInlineGoogleAd") && slot.includes("updateInlineGoogleAd"));
check("Home top has stable paid slot", home.includes('slotKey="home-top"'));
check("Home player has stable paid slot", home.includes('slotKey="home-player"'));
check("Darts Home title is DARTS SCORING", home.includes('return "DARTS SCORING"'));
check("Ticker inserts monetized ad slides", home.includes("monetizedAd: true"));

check(
  "Ticker avoids a third paid Google surface",
  !ticker.includes('slotKey="home-ticker"')
    && !ticker.includes("PaidInlineSurface")
    && ticker.includes("home-top")
    && ticker.includes("home-player")
);

check(
  "Verified ad-free users do not receive paid inline ads",
  slot.includes("getVerifiedAdFreeState")
    && slot.includes("subscribeVerifiedEntitlements")
    && slot.includes("!adFreeActive")
);

check("MainActivity registers InlineAdMob plugin", mainActivity.includes("registerPlugin(InlineAdMobPlugin.class)"));
check("Android plugin creates real Google AdView", inlineJava.includes("new AdView") && inlineJava.includes("AdRequest.Builder"));
check("Android plugin uses inline adaptive banner size", inlineJava.includes("getInlineAdaptiveBannerAdSize"));
check("Android plugin follows WebView rectangle", inlineJava.includes("getWebViewOffset") && inlineJava.includes("leftMargin") && inlineJava.includes("topMargin"));
check("Android app exposes GMA SDK to custom plugin", appGradle.includes("com.google.android.gms:play-services-ads:"));
check("AdMob dependency pinned compatibly with plugin v8", variablesGradle.includes("playServicesAdsVersion = '24.9.0'"));
check("Android configurator can read VITE App ID from .env", configure.includes("dotenv.VITE_ADMOB_ANDROID_APP_ID"));

const failed = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) console.log(`${ok ? "✅" : "❌"} ${label}`);
if (failed.length) {
  console.error(`\n❌ AdMob paid inline regression: ${checks.length - failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\n✅ AdMob paid inline regression: ${checks.length}/${checks.length}`);
