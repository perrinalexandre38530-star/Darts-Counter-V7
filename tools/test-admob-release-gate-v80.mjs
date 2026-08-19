#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const pkg = JSON.parse(read("package.json"));
const config = JSON.parse(read("config/admob.public.json"));
const runtime = read("src/monetization/adMobConfig.ts");
const native = read("src/monetization/nativeAdMob.ts");
const panel = read("src/monetization/MonetizationSettingsPanel.tsx");
const guard = read("tools/admob-release-check.mjs");
const setter = read("tools/set-admob-fullscreen-ids.mjs");

assert.equal(pkg.scripts["admob:release-check"], "node ./tools/admob-release-check.mjs", "release guard script absent");
assert.equal(pkg.scripts["admob:fullscreen:check"], "node ./tools/admob-release-check.mjs --require-fullscreen", "strict fullscreen guard absent");
assert.equal(pkg.scripts["admob:fullscreen:set"], "node ./tools/set-admob-fullscreen-ids.mjs", "safe fullscreen setter absent");
assert.ok(pkg.scripts["android:sync"].includes("npm run admob:release-check"), "Android sync must run AdMob release guard");
assert.ok(pkg.scripts["test:admob-native"].includes("test-admob-release-gate-v80.mjs"), "AdMob regression chain must include V80 release gate");

assert.ok(runtime.includes("fullMonetizationReady: boolean"), "runtime full readiness flag absent");
assert.ok(runtime.includes('mode === "production" && realConfigurationReady && interstitialReady && rewardedReady'), "full readiness must require both real fullscreen IDs");
assert.ok(native.includes("fullMonetizationReady: config.fullMonetizationReady"), "native status does not expose full readiness");
assert.ok(panel.includes("MONÉTISATION ADMOB COMPLÈTE · PRÊTE"), "settings release status missing");
assert.ok(panel.includes("BANNIÈRES LIVE · PLEIN ÉCRAN EN ATTENTE"), "banner-only state missing");

assert.ok(guard.includes('process.argv.includes("--require-fullscreen")'), "strict release flag absent");
assert.ok(guard.includes("Interstitiel réel obligatoire pour la monétisation complète"), "strict interstitial requirement absent");
assert.ok(guard.includes("Rewarded réel obligatoire pour la monétisation complète"), "strict rewarded requirement absent");
assert.ok(setter.includes("GOOGLE_DEMO_UNITS.has(interstitial)"), "production setter must reject demo interstitial");
assert.ok(setter.includes("GOOGLE_DEMO_UNITS.has(rewarded)"), "production setter must reject demo rewarded");
assert.ok(setter.includes("publisher(interstitial) !== pub"), "production setter must enforce publisher ownership");
assert.ok(setter.includes("interstitial === rewarded"), "production setter must require distinct ad units");
assert.ok(setter.includes("fs.renameSync(tempPath, configPath)"), "production setter must update config atomically");

assert.equal(config.mode, "production", "current public config must stay production banner-ready");
assert.equal(String(config.androidInterstitialId || ""), "", "V80 must not invent a live interstitial ID");
assert.equal(String(config.androidRewardedId || ""), "", "V80 must not invent a live rewarded ID");

console.log("✅ ADMOB RELEASE GATE V80 REGRESSION OK");
console.log("   Release Android: guard AdMob automatique");
console.log("   Fullscreen: activation atomique + validation éditeur + anti-ID démo");
console.log("   État actuel: bannières live prêtes, interstitiel/rewarded toujours volontairement désactivés");
