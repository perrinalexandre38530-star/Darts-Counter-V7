import fs from "node:fs";
import assert from "node:assert/strict";

const read = (p) => fs.readFileSync(p, "utf8");
const prefs = read("src/monetization/prefs.ts");
const manager = read("src/monetization/MonetizationManager.ts");
const slot = read("src/monetization/AdSlot.tsx");
const home = read("src/pages/Home.tsx");
const panel = read("src/monetization/MonetizationSettingsPanel.tsx");

assert.ok(prefs.includes('getAdMobRuntimeConfig().mode === "production"'));
assert.ok(prefs.includes("next.adsEnabled = true"));
assert.ok(prefs.includes("next.bannersEnabled = true"));
assert.ok(prefs.includes("if (getVerifiedAdFreeState().active) return false"));
assert.ok(manager.includes("canRequestPaidAds(prefs)"));
assert.ok(slot.includes("canRequestBannerAds(prefs)"));
assert.ok(home.includes("canRequestBannerAds(adPrefs)"));
assert.ok(panel.includes("disabled={productionAdsLocked}"));
assert.ok(panel.includes("1 PUB / 1 PARTIE"));
assert.ok(panel.includes("TECHNIQUE PRÊTE · ID À CRÉER"));

console.log("✅ MONETIZATION FREE LOCK V75 OK");
console.log("   FREE production : pubs non désactivables localement");
console.log("   Premium/Sans pub vérifié : garde conservée");
console.log("   Interstitiel/Rewarded : statuts exposés sans activation sauvage");
