#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));
const required = [
  "src/lib/gameEngines/cargoEngine.ts",
  "src/pages/CargoConfig.tsx",
  "src/pages/CargoPlay.tsx",
  "src/pages/CargoEnd.tsx",
  "src/components/stats/CargoStatsTabFull.tsx",
  "src/components/history/CargoHistoryScoreBlock.tsx",
  "src/assets/tickers/ticker_cargo.png",
];
for (const rel of required) assert.ok(exists(rel), `fichier CARGO manquant: ${rel}`);
const png = fs.readFileSync(path.join(root, "src/assets/tickers/ticker_cargo.png"));
assert.equal(png.readUInt32BE(16), 800, "ticker CARGO: largeur attendue 800");
assert.equal(png.readUInt32BE(20), 230, "ticker CARGO: hauteur attendue 230");
const engine = read("src/lib/gameEngines/cargoEngine.ts");
for (const token of ["cargo_classic","free_load","full_pallet","exact_load","fragile_cargo","cargo_rush","convoy","long_haul","parcel_delivery","playCargoVisit","buildCargoMatchStats","computeCargoMissionGrade","cargoEventPresentation"]) assert.ok(engine.includes(token), `moteur incomplet: ${token}`);
const config = read("src/pages/CargoConfig.tsx");
for (const token of ["CONFIGURATION GUIDÉE","CONFIGURATION COMPLÈTE","LANCER CARGO","CARGO_VARIANT_LABELS","parcel_delivery","participantMode","truckCapacity","fragileRate","urgentRate"]) assert.ok(config.includes(token), `configuration incomplète: ${token}`);
const play = read("src/pages/CargoPlay.tsx");
for (const token of ["CargoEnd","History as any).upsert(buildHistoryRecord(\"in_progress\")","onFinish?.(buildHistoryRecord(\"finished\"), { navigate: false })","Keypad","MANIFESTE DE CHARGEMENT","JOURNAL DES CHARGEMENTS","EventToast","cargoEventPresentation"]) assert.ok(play.includes(token), `écran Play incomplet: ${token}`);
const app = read("src/App.tsx");
assert.ok(app.includes('case "cargo_config"'), "route config CARGO absente");
assert.ok(app.includes('case "cargo_play"'), "route play CARGO absente");
assert.ok(app.includes("<CargoPlay"), "écran CARGO non monté");
const registry = read("src/games/dartsGameRegistry.ts");
assert.ok(registry.includes('id: "cargo"'), "carte Games CARGO absente");
assert.ok(registry.includes('tab: "cargo_config"'), "carte CARGO non reliée");
const readyBlock = registry.split("const READY_IDS")[1] || "";
assert.ok(readyBlock.includes('"cargo"'), "CARGO absent de READY_IDS");
const end = read("src/pages/CargoEnd.tsx");
for (const token of ["BILAN DE MISSION","RÉCOMPENSES","CHRONOLOGIE","computeCargoMissionGrade"]) assert.ok(end.includes(token), `écran de fin V3 incomplet: ${token}`);
const cargoStatsPage = read("src/components/stats/CargoStatsTabFull.tsx");
for (const token of ["Centre de performances","Évolution des missions","Qualité logistique","Comparatif des variantes","Segments les plus touchés"]) assert.ok(cargoStatsPage.includes(token), `stats CARGO V3 incomplètes: ${token}`);
const historyCard = read("src/components/history/CargoHistoryScoreBlock.tsx");
for (const token of ["PRÉCISION","CONTRATS","SÉRIE"]) assert.ok(historyCard.includes(token), `carte historique V3 incomplète: ${token}`);
const stats = read("src/pages/StatsHub.tsx");
assert.ok(stats.includes('key: "cargo"'), "onglet StatsHub CARGO absent");
assert.ok(stats.includes("<CargoStatsTabFull"), "dashboard CARGO absent");
assert.ok(stats.includes('return "cargo"'), "classification StatsHub CARGO absente");
if (exists("src/pages/HistoryPage.tsx")) {
  const history = read("src/pages/HistoryPage.tsx");
  assert.ok(history.includes('go("cargo_play"'), "reprise CARGO absente de l’historique");
  assert.ok(history.includes('initialStatsSubTab: "cargo"'), "raccourci stats CARGO absent de l’historique");
  assert.ok(history.includes("CargoHistoryScoreBlock"), "carte historique CARGO enrichie absente");
}
const home = read("src/lib/homeModeStats.ts");
assert.ok(home.includes('case "cargo"'), "résumé HOME CARGO absent");
const compact = read("src/lib/matchCompactCodec.ts");
assert.ok(compact.includes('mode === "cargo"'), "codec compact CARGO absent");
const normalized = read("src/lib/statsNormalized.ts");
assert.ok(normalized.includes('return "cargo"'), "normalisation CARGO absente");
const games = read("src/pages/Games.tsx");
assert.ok(games.includes('"cargo",\n      "darts_poker"'), "ticker NEW GAME CARGO absent");
console.log("✅ CARGO INTEGRATION CONTRACT OK");
