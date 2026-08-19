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
const homePage = read("src/pages/Home.tsx");
const profilesPage = read("src/pages/Profiles.tsx");
const tournamentsPage = read("src/pages/TournamentsHome.tsx");
const statsPage = read("src/pages/StatsShell.tsx");
const settingsPage = read("src/pages/Settings.tsx");
const messagesPage = read("src/pages/MessagesPage.tsx");
const screensPage = read("src/pages/cast/CastHostPage.tsx");

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

// 6) Politique interstitielle FREE : après chaque partie, sans cooldown.
assert.ok(prefs.includes("endGameAdTiming: \"after_results\""), "Le timing par défaut doit rester après résultats.");
assert.ok(prefs.includes("endGameEveryMatches: 1"), "La fréquence doit être 1 pub / 1 partie.");
assert.ok(prefs.includes("minInterstitialIntervalMs: 0"), "Aucun intervalle minimum ne doit subsister.");
assert.ok(!manager.includes("prefs.endGameEveryMatches"), "Le manager ne doit plus appliquer de modulo de parties.");
assert.ok(!manager.includes("prefs.minInterstitialIntervalMs"), "Le manager ne doit plus appliquer de cooldown.");

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
assert.ok(homePage.includes('slotKey="home-top"') && homePage.includes('slotKey="home-player"'), "Home doit conserver ses deux bannières inline dédiées.");
for (const [name, source, placement] of [
  ["Profils", profilesPage, "profiles"],
  ["Compétitions", tournamentsPage, "competitions"],
  ["Stats", statsPage, "stats"],
  ["Réglages", settingsPage, "settings"],
  ["Messages", messagesPage, "messages"],
  ["Écrans", screensPage, "screens"],
]) {
  assert.ok(source.includes("PageAdBanner"), `${name} doit utiliser PageAdBanner.`);
  assert.ok(source.includes(`placement="${placement}"`), `${name} utilise un mauvais placement AdMob.`);
}

// 8) Premium / Sans pub : jamais un simple localStorage premium=true.
assert.ok(manager.includes("getVerifiedAdFreeState().active"), "Garde Premium/Sans pub vérifiée absente du manager.");
assert.ok(!/localStorage[^\n]*(premium|entitlement)/i.test(manager), "Le manager ne doit pas faire confiance à un Premium localStorage.");


// 9) Production FREE : impossible de couper les pubs via Settings/localStorage.
assert.ok(prefs.includes('getAdMobRuntimeConfig().mode === "production"'), "Le verrou FREE production n'est pas relié au mode AdMob.");
assert.ok(prefs.includes("next.adsEnabled = true") && prefs.includes("next.bannersEnabled = true"), "La migration production ne réactive pas les pubs FREE.");
assert.ok(prefs.includes("arePaidAdsLockedForFreeAccount"), "Helper de verrou publicitaire FREE absent.");
assert.ok(manager.includes("canRequestPaidAds(prefs)"), "L'interstitiel peut encore être contourné par une préférence locale.");
assert.ok(adSlot.includes("canRequestBannerAds(prefs)"), "Les bannières peuvent encore être contournées par une préférence locale.");
assert.ok(homePage.includes("canRequestBannerAds(adPrefs)"), "Le ticker Home peut encore être contourné par une préférence locale.");

console.log("✅ MONETIZATION RC REGRESSION OK");
console.log(`   Product IDs contrôlés : ${new Set(productIds).size}`);
console.log("   History.upsert final : centralisé");
console.log("   Ads : après persistance uniquement");
console.log("   PLAY : aucune bannière autorisée");
