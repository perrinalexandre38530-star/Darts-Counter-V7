import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const prefs = read("src/monetization/prefs.ts");
const manager = read("src/monetization/MonetizationManager.ts");
const panel = read("src/monetization/MonetizationSettingsPanel.tsx");

assert.ok(prefs.includes("endGameVideoEnabled: true"), "L'interstitiel de fin doit être activé.");
assert.ok(prefs.includes('endGameAdTiming: "after_results"'), "La pub doit arriver après les résultats.");
assert.ok(prefs.includes("endGameEveryMatches: 1"), "La cadence doit être 1/1.");
assert.ok(prefs.includes("minInterstitialIntervalMs: 0"), "Le cooldown doit être nul.");
assert.ok(manager.includes("chaque partie réellement terminée et sauvegardée"), "La politique 1/1 n'est pas documentée dans le manager.");
assert.ok(!manager.includes("prefs.endGameEveryMatches"), "Un modulo de parties subsiste.");
assert.ok(!manager.includes("prefs.minInterstitialIntervalMs"), "Un cooldown subsiste.");
assert.ok(manager.includes("getVerifiedAdFreeState().active"), "Le garde PREMIUM/SANS PUB manque.");
assert.ok(panel.includes("1 PUB / 1 PARTIE"), "L'interface n'affiche pas la politique 1/1.");
assert.ok(!panel.includes("Fréquence maximum"), "L'ancien sélecteur de fréquence subsiste.");
assert.ok(!panel.includes("Intervalle minimum"), "L'ancien sélecteur de cooldown subsiste.");

console.log("✅ INTERSTITIEL 1/1 REGRESSION OK");
console.log("   FREE : une tentative après chaque partie terminée");
console.log("   PREMIUM/SANS PUB : blocage conservé");
console.log("   Cooldown : supprimé");
