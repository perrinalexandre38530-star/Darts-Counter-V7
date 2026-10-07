#!/usr/bin/env node
import fs from "node:fs";
import assert from "node:assert/strict";

const policy = fs.readFileSync("src/config/androidStoreV1.ts", "utf8");
const gameSelect = fs.readFileSync("src/pages/GameSelect.tsx", "utf8");
const quickSwitch = fs.readFileSync("src/components/SportQuickSwitch.tsx", "utf8");
const bottomNav = fs.readFileSync("src/components/BottomNav.tsx", "utf8");
const games = fs.readFileSync("src/pages/Games.tsx", "utf8");
const registry = fs.readFileSync("src/games/dartsGameRegistry.ts", "utf8");
const app = fs.readFileSync("src/App.tsx", "utf8");

for (const id of ["darts", "babyfoot", "petanque", "running", "fit"]) {
  assert.ok(policy.includes(`"${id}"`), `Sport Store V1 manquant: ${id}`);
}
for (const id of [
  "x01", "cricket", "killer", "darts_poker", "shanghai", "training_x01", "tour_horloge",
  "five_lives", "gros_6", "golf", "departements", "capital", "loterie", "attrape_moi",
  "killer_progressive", "baseball", "darts_firefighter", "challenge", "crados",
]) {
  assert.ok(policy.includes(`"${id}"`), `Mode Darts Store V1 manquant: ${id}`);
}
assert.ok(gameSelect.includes("filterSportsForCurrentRuntime"), "GameSelect ne filtre pas les sports Android V1.");
assert.ok(quickSwitch.includes("filterSportsForCurrentRuntime"), "SportQuickSwitch ne filtre pas les sports Android V1.");
assert.ok(bottomNav.includes("shouldHideOnlineMessagingForCurrentRuntime"), "BottomNav n'applique pas la politique Online/Messages Android.");
assert.match(policy, /shouldHideOnlineMessagingForCurrentRuntime[\s\S]*?return false;/, "Online/Messages doivent être publiés sur Android pour les disciplines compatibles.");
assert.ok(bottomNav.includes('{ k: "tournaments"'), "Compétitions doit rester disponible en Android V1.");
assert.ok(bottomNav.includes('{ k: "cast_host"'), "Écrans/Cast doit rester disponible en Android V1.");
assert.ok(games.includes("filterDartsGamesForCurrentRuntime"), "Games n'applique pas la whitelist Darts Android V1.");

// GROS 6 doit rester publiable dans l'APK Android : carte Games + routes + capacités.
assert.match(registry, /id:\s*["']gros_6["'][\s\S]*?ready:\s*true/, "Gros 6 n'est pas marqué prêt dans le registry.");
assert.match(registry, /id:\s*["']gros_6["'][\s\S]*?supportsTeams:\s*true/, "Gros 6 Android doit conserver le mode Teams.");
assert.match(registry, /id:\s*["']gros_6["'][\s\S]*?supportsBots:\s*true/, "Gros 6 Android doit conserver les BOTS.");
assert.ok(app.includes('case "gros_6_config"'), "Route Android Gros 6 config absente.");
assert.ok(app.includes('case "gros_6_play"'), "Route Android Gros 6 play absente.");
assert.match(registry, /id:\s*["']challenge["'][\s\S]*?ready:\s*true[\s\S]*?supportsTeams:\s*true/, "Challenge Android doit être prêt et conserver les équipes.");
assert.match(registry, /id:\s*["']crados["'][\s\S]*?ready:\s*true[\s\S]*?supportsBots:\s*true/, "CRADOS Android doit être prêt et conserver les bots.");

const personalCloud = fs.readFileSync("src/lib/personalCloudApi.ts", "utf8");
const manifest = fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
const socialAuthPlugin = fs.readFileSync("android/app/src/main/java/com/multisportsscoring/app/SocialAuthPlugin.java", "utf8");
const server = fs.readFileSync("server.js", "utf8");
assert.ok(personalCloud.includes('multisportsscoring://cloud/callback'), "Callback natif Google Drive absent.");
assert.ok(personalCloud.includes('NativeOAuth.openExternal'), "Google Drive Android doit ouvrir le navigateur système.");
assert.ok(personalCloud.includes('initNativePersonalCloudBridge'), "Bridge retour Google Drive Android absent.");
assert.ok(manifest.includes('android:host="cloud"') && manifest.includes('android:pathPrefix="/callback"'), "Deep link cloud Android absent du manifest.");
assert.ok(socialAuthPlugin.includes('call.getString("prefix")'), "Le bridge natif doit filtrer les callbacks OAuth par préfixe.");
assert.ok(server.includes('personalCloudCallbackTarget') && server.includes('multisportsscoring://cloud/callback'), "Le serveur ne renvoie pas le callback Drive vers Android.");

console.log("✅ ANDROID STORE V1 POLICY CHECK OK");
console.log("   Sports: Darts · Baby-foot · Pétanque · Running Performance · FIT PERF");
console.log("   Online/Messages publiés pour les disciplines compatibles · Compétitions/Cast conservés");
console.log("   Darts: Darts Firefighter + GROS 6 + CHALLENGE + CRADOS inclus");
console.log("   Google Drive Android: navigateur système + deep link de retour contrôlé");
