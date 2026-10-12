import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const config = read("src/pages/newModes/NewDartsModeConfig.tsx");
for (const mode of ["pendu", "menteur"]) {
  assert.match(config, new RegExp(`mode === ["']${mode}["']`), `${mode}: absent du socle premium de configuration`);
}
for (const token of ["sfxEnabled", "awenaEnabled", "coachEnabled"]) {
  assert.match(config, new RegExp(token), `config premium: ${token} absent`);
}

for (const [mode, file] of [["pendu", "src/pages/PenduPlay.tsx"], ["menteur", "src/pages/MenteurPlay.tsx"]]) {
  const src = read(file);
  for (const token of [
    "PremiumEndPanel", "SummaryStrip", "ActiveHero", "QuickRow", "PremiumAwenaButton",
    "FloatingAdvice", "History.upsert", "History.get", "pagehide", "visibilitychange",
    "playNewModeDartSfx", "playNewModeDartSequence", "saveInProgress", "doUndo",
  ]) assert.match(src, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${mode}: contrat premium manquant: ${token}`);
  assert.match(src, /currentThrow/, `${mode}: brouillon de volée non persisté`);
  assert.match(src, /stateSnapshot/, `${mode}: snapshot de reprise absent`);
}

const penduEngine = read("src/lib/gameEngines/penduEngine.ts");
for (const token of ["callerSuccesses", "copySuccesses", "bestSuccessStreak", "singles", "doubles", "triples", "bulls", "dbulls", "misses"]) {
  assert.match(penduEngine, new RegExp(token), `PENDU moteur/stat manquant: ${token}`);
}
const menteurEngine = read("src/lib/gameEngines/menteurEngine.ts");
for (const token of ["successfulCalls", "failedCalls", "contractsAttempted", "contractsProven", "maxBid", "bestProofStreak", "singles", "doubles", "triples", "bulls", "dbulls", "misses"]) {
  assert.match(menteurEngine, new RegExp(token), `MENTEUR moteur/stat manquant: ${token}`);
}

const summary = read("src/pages/DartsModeSummaryPage.tsx");
for (const token of ["Défis du meneur réussis", "Copies réussies", "Meilleure série", "Appels gagnés", "Plus haute enchère", "Meilleure série preuve", "Taux preuve"]) {
  assert.match(summary, new RegExp(token), `Résumé premium manquant: ${token}`);
}

console.log("✅ PENDU / MENTEUR Premium V5 contract OK");
