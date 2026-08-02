#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const cfg = JSON.parse(fs.readFileSync(path.join(root, "config", "admob.public.json"), "utf8"));
const runtime = fs.readFileSync(path.join(root, "src", "monetization", "adMobConfig.ts"), "utf8");
const native = fs.readFileSync(path.join(root, "src", "monetization", "nativeAdMob.ts"), "utf8");
const configure = fs.readFileSync(path.join(root, "tools", "configure-android-admob.mjs"), "utf8");

const unit = /^ca-app-pub-\d{16}\/\d{10}$/;
assert.equal(cfg.mode, "production", "Le build livré doit demander des bannières AdMob live.");
assert.equal(cfg.realTestUseGoogleDemoBanners, false, "Les bannières démo Google doivent être désactivées.");
assert.deepEqual(cfg.testDeviceIds, [], "Aucun appareil de test ne doit être injecté dans le build public.");
assert.match(cfg.androidAppId, /^ca-app-pub-\d{16}~\d{10}$/, "App ID AdMob réel invalide.");
assert.match(cfg.androidBannerId, unit, "Bannière générique réelle invalide.");
for (const [placement, id] of Object.entries(cfg.androidBannerIds || {})) {
  assert.match(String(id), unit, `Bannière réelle invalide pour ${placement}.`);
}
assert.ok(runtime.includes("formats plein écran sont indépendants"), "Le mode banner-only production n'est pas protégé.");
assert.ok(native.includes("!config.interstitialReady"), "Un interstitiel manquant doit être désactivé sans ID démo.");
assert.ok(native.includes("!config.rewardedReady"), "Un rewarded manquant doit être désactivé sans ID démo.");
assert.ok(configure.includes("publicConfig.androidAppId"), "La CI doit injecter l'App ID réel sans fichier .env.");

console.log("✅ ADMOB LIVE BANNERS REGRESSION OK");
console.log(`   Bannières réelles contrôlées : ${Object.keys(cfg.androidBannerIds || {}).length + 1}`);
console.log("   Appareils non déclarés test : impressions live possibles");
console.log("   Interstitiel/rewarded manquants : désactivés, aucun fallback démo en production");
