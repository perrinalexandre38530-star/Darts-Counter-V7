import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const app = read("src/App.tsx");
const prefs = read("src/monetization/prefs.ts");
const adSlot = read("src/monetization/AdSlot.tsx");
const nativeAdMob = read("src/monetization/nativeAdMob.ts");
const inlineAdMob = read("src/monetization/inlineAdMob.ts");
const catalog = read("src/monetization/catalog.ts");
const manager = read("src/monetization/MonetizationManager.ts");

function count(text, needle) {
  return text.split(needle).length - 1;
}

// 1) Une seule porte de persistance finale dans App.tsx.
assert.equal(
  count(app, "await History.upsert(saved);"),
  1,
  "App.tsx doit centraliser la persistance finale dans persistFinishedMatchForAds()."
);
assert.ok(app.includes("async function persistFinishedMatchForAds"), "Helper de persistance monétisée manquant.");

// 2) La pub ne doit être comptée qu'après un History.upsert réussi.
const helperStart = app.indexOf("async function persistFinishedMatchForAds");
const helperEnd = app.indexOf("\n  /* --------------------------------------------", helperStart);
const helper = app.slice(helperStart, helperEnd > helperStart ? helperEnd : helperStart + 1800);
const upsertPos = helper.indexOf("await History.upsert(saved)");
const adCountPos = helper.indexOf("markCompletedMatchForAds");
assert.ok(upsertPos >= 0 && adCountPos > upsertPos, "La partie est comptée pour la pub avant la sauvegarde Historique.");

// 3) Les anciens hooks précoces ne doivent plus exister dans les finish handlers.
assert.equal(count(app, "// MONETIZATION_COMPLETE:"), 0, "Ancien hook pub pré-persistance encore présent.");

// 4) Les 6 familles de persistance doivent passer par le helper.
for (const mode of ["game", "petanque", "baby_foot", "ping_pong", "molkky", "dice"]) {
  const expected = mode === "game"
    ? 'persistFinishedMatchForAds(saved, String(saved.kind || "game"))'
    : `persistFinishedMatchForAds(saved, "${mode}")`;
  assert.ok(app.includes(expected), `Persistance monétisée absente pour ${mode}.`);
}

// 5) IDs Google Play : identité MULTISPORTS SCORING uniquement.
const productIds = [...catalog.matchAll(/googlePlayProductId:\s*"([^"]+)"/g)].map((m) => m[1]);
for (const m of catalog.matchAll(/:\s*"(msc_[^"]+)"/g)) productIds.push(m[1]);
assert.ok(productIds.length >= 9, "Catalogue Google Play incomplet.");
assert.ok(productIds.every((id) => id.startsWith("msc_")), "Un Product ID n'utilise pas le préfixe msc_.");
assert.ok(!catalog.includes('"dc_'), "Ancien préfixe produit dc_ encore présent dans catalog.ts.");

// 6) Valeurs de fréquence sûres par défaut.
assert.ok(prefs.includes("endGameAdTiming: \"after_results\""), "Le timing par défaut doit rester après résultats.");
assert.ok(prefs.includes("endGameEveryMatches: 3"), "La fréquence par défaut doit rester 1 pub / 3 parties.");
assert.ok(prefs.includes("minInterstitialIntervalMs: 8 * 60 * 1000"), "L'intervalle minimum par défaut doit rester 8 minutes.");

// 7) Bannières : toutes les entrées principales BottomNav, jamais un écran *_play.
for (const allowed of [
  "home", "messages", "profiles", "games", "tournaments", "online",
  "stats", "settings", "cast_host", "statsHub", "statsDetail"
]) {
  assert.ok(adSlot.includes(`"${allowed}"`), `Route bannière attendue absente : ${allowed}`);
}
assert.ok(!/route\s*===\s*"[^"]*_play"/.test(adSlot), "Un écran PLAY est éligible aux bannières.");
assert.ok(nativeAdMob.includes("aucun banner AdMob natif ne doit flotter") && nativeAdMob.includes("removeBanner"), "Le garde-fou banner natif flottant est absent.");
assert.ok(adSlot.includes("PaidInlineSurface") && adSlot.includes("showInlineGoogleAd"), "Le chemin AdMob intégré au flux React est absent.");
assert.ok(inlineAdMob.includes('registerPlugin("InlineAdMob")'), "Le pont Capacitor InlineAdMob est absent.");
assert.ok(app.includes('adBannerPlacement !== "home"'), "Home doit gérer ses deux pubs directement dans Home.tsx.");
assert.ok(app.includes('<AdSlot placement={adBannerPlacement} />'), "Les pages BottomNav hors Home doivent recevoir leur bloc pub intégré.");

// 8) Premium : jamais un simple localStorage premium=true.
assert.ok(manager.includes("getVerifiedPremiumState().active"), "Garde Premium vérifiée absente du manager.");
assert.ok(!/localStorage[^\n]*(premium|entitlement)/i.test(manager), "Le manager ne doit pas faire confiance à un Premium localStorage.");

console.log("✅ MONETIZATION RC REGRESSION OK");
console.log(`   Product IDs contrôlés : ${new Set(productIds).size}`);
console.log("   History.upsert final : centralisé");
console.log("   Ads : après persistance uniquement");
console.log("   PLAY : aucune bannière autorisée");
