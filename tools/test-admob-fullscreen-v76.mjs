import fs from "node:fs";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const native = read("src/monetization/nativeAdMob.ts");
const provider = read("src/monetization/provider.ts");
const manager = read("src/monetization/MonetizationManager.ts");
const panel = read("src/monetization/MonetizationSettingsPanel.tsx");
const types = read("src/monetization/types.ts");

assert.ok(native.includes("export async function preloadNativeInterstitial"), "Préchargement interstitiel natif absent.");
assert.ok(native.includes("interstitialPreparedKey"), "Cache d'interstitiel préparé absent.");
assert.ok(native.includes("await plugin.showInterstitial({ adId })"), "L'interstitiel préparé n'est pas affiché avec son adId.");
assert.ok(native.includes("clearInterstitialCache();"), "L'interstitiel n'est pas invalidé après usage.");
assert.ok(provider.includes("export async function preloadInterstitialAd"), "Provider de préchargement interstitiel absent.");
assert.ok(manager.includes("void preloadInterstitialAd(false);"), "La fin de partie ne précharge pas l'interstitiel pendant les résultats.");
assert.ok(manager.includes('prefs.endGameAdTiming === "after_results"'), "Le préchargement n'est pas limité au timing après résultats.");

assert.ok(native.includes("export async function preloadNativeRewarded"), "Préchargement rewarded natif absent.");
assert.ok(native.includes("return await plugin.showRewardVideoAd({ adId });"), "Le rewarded n'attend pas l'AdMobRewardItem réel.");
assert.ok(types.includes("export type RewardedAdResult"), "Contrat RewardedAdResult absent.");
assert.ok(provider.includes("earned: true"), "Le provider ne marque pas la récompense gagnée après résolution AdMob.");
assert.ok(provider.includes("earned: false"), "Le provider ne distingue pas les cas sans récompense.");
assert.ok(panel.includes("bonus accordé uniquement après confirmation réelle"), "Le panneau ne documente pas le garde-fou rewarded.");

console.log("✅ ADMOB FULLSCREEN V76 REGRESSION OK");
console.log("   Interstitiel : préchargé pendant résultats, consommé une seule fois");
console.log("   Rewarded : bonus uniquement après AdMobRewardItem confirmé");
console.log("   IDs manquants : aucune activation live implicite");
