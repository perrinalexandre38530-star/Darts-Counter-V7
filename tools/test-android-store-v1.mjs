#!/usr/bin/env node
import fs from "node:fs";
import assert from "node:assert/strict";

const policy = fs.readFileSync("src/config/androidStoreV1.ts", "utf8");
const gameSelect = fs.readFileSync("src/pages/GameSelect.tsx", "utf8");
const quickSwitch = fs.readFileSync("src/components/SportQuickSwitch.tsx", "utf8");
const bottomNav = fs.readFileSync("src/components/BottomNav.tsx", "utf8");
const games = fs.readFileSync("src/pages/Games.tsx", "utf8");

for (const id of ["darts", "babyfoot", "petanque", "running", "fit"]) {
  assert.ok(policy.includes(`"${id}"`), `Sport Store V1 manquant: ${id}`);
}
for (const id of [
  "x01", "cricket", "killer", "darts_poker", "shanghai", "training_x01", "tour_horloge",
  "five_lives", "golf", "departements", "capital", "loterie", "attrape_moi",
  "killer_progressive", "baseball", "darts_firefighter",
]) {
  assert.ok(policy.includes(`"${id}"`), `Mode Darts Store V1 manquant: ${id}`);
}
assert.ok(gameSelect.includes("filterSportsForCurrentRuntime"), "GameSelect ne filtre pas les sports Android V1.");
assert.ok(quickSwitch.includes("filterSportsForCurrentRuntime"), "SportQuickSwitch ne filtre pas les sports Android V1.");
assert.ok(bottomNav.includes("shouldHideOnlineMessagingForCurrentRuntime"), "BottomNav n'applique pas la politique Online/Messages Android V1.");
assert.ok(bottomNav.includes('{ k: "tournaments"'), "Compétitions doit rester disponible en Android V1.");
assert.ok(bottomNav.includes('{ k: "cast_host"'), "Écrans/Cast doit rester disponible en Android V1.");
assert.ok(games.includes("filterDartsGamesForCurrentRuntime"), "Games n'applique pas la whitelist Darts Android V1.");
console.log("✅ ANDROID STORE V1 POLICY CHECK OK");
console.log("   Sports: Darts · Baby-foot · Pétanque · Running Performance · FIT PERF");
console.log("   Online/Messages masqués · Compétitions/Cast conservés");
console.log("   Darts: Store V1 validé, Darts Firefighter inclus");
