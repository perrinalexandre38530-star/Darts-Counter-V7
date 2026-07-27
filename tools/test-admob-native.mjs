#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const checks = [];
function check(label, ok) { checks.push([label, !!ok]); }

const config = read("src/monetization/adMobConfig.ts");
const native = read("src/monetization/nativeAdMob.ts");
const provider = read("src/monetization/provider.ts");
const slot = read("src/monetization/AdSlot.tsx");
const settings = read("src/monetization/MonetizationSettingsPanel.tsx");
const boot = read("tools/bootstrap-android-capacitor.mjs");
const configure = read("tools/configure-android-admob.mjs");

check("Google test banner ID", config.includes("ca-app-pub-3940256099942544/6300978111"));
check("Google test interstitial ID", config.includes("ca-app-pub-3940256099942544/1033173712"));
check("Google test rewarded ID", config.includes("ca-app-pub-3940256099942544/5224354917"));
check("Production requires complete IDs", config.includes("productionComplete"));
check("UMP requested before ads", native.indexOf("requestConsentInfo") < native.indexOf("prepareInterstitial"));
check("Consent can block ad request", native.includes("if (!status.canRequestAds) return false"));
check("Native banner above BottomNav", native.includes("margin: 76"));
check("Provider calls native interstitial", provider.includes("showNativeInterstitial"));
check("Provider calls native rewarded", provider.includes("showNativeRewarded"));
check("Native AdSlot removes banner on unmount", slot.includes("removeNativeBanner"));
check("Settings exposes privacy options", settings.includes("showNativePrivacyOptions"));
check("Bootstrap installs AdMob 8", boot.includes("@capacitor-community/admob@${ADMOB_PLUGIN_VERSION}"));
check("Android Manifest configurator exists", configure.includes("com.google.android.gms.ads.APPLICATION_ID"));
check("Android test App ID", configure.includes("ca-app-pub-3940256099942544~3347511713"));

const failed = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) console.log(`${ok ? "✅" : "❌"} ${label}`);
if (failed.length) process.exit(1);
console.log(`\n✅ AdMob native/UMP regression: ${checks.length}/${checks.length}`);
