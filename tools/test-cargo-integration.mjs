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
for (const token of [
  "cargo_classic","free_load","full_pallet","exact_load","fragile_cargo","cargo_rush","convoy","long_haul","parcel_delivery",
  "playCargoVisit","buildCargoMatchStats","buildCargoPlayerAdvancedStats","buildCargoTeamStats","computeCargoMissionGrade","cargoEventPresentation",
  "teamCount","teamNames"
]) assert.ok(engine.includes(token), `moteur incomplet: ${token}`);

const config = read("src/pages/CargoConfig.tsx");
for (const token of [
  "CONFIGURATION GUIDÉE","CONFIGURATION COMPLÈTE","LANCER CARGO","CARGO_VARIANT_LABELS","parcel_delivery","participantMode",
  "teamCount","teamAssignments","ÉQUILIBRER","MULTI CARGO","truckCapacity","fragileRate","urgentRate","ticker_cargo.png"
]) assert.ok(config.includes(token), `configuration incomplète: ${token}`);
assert.ok(!config.includes("ticker_cargo.svg"), "CargoConfig ne doit plus référencer de SVG CARGO");

const play = read("src/pages/CargoPlay.tsx");
for (const token of [
  "CargoEnd","History as any).upsert(buildHistoryRecord(\"in_progress\")","History as any).upsert(record)",
  "onFinish?.(record, { navigate: false })","buildCargoPlayerAdvancedStats","buildCargoTeamStats","Keypad",
  "MANIFESTE DE CHARGEMENT","JOURNAL DES CHARGEMENTS","EventToast","cargoEventPresentation","ticker_cargo.png"
]) assert.ok(play.includes(token), `écran Play incomplet: ${token}`);
assert.ok(!play.includes("ticker_cargo.svg"), "CargoPlay ne doit plus référencer de SVG CARGO");

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
for (const token of ["BILAN DE MISSION","TABLEAU DE PERFORMANCE","RÉPARTITION DES IMPACTS","CLASSEMENT DES ÉQUIPES","JOURNAL DE MISSION","buildCargoTeamStats","computeCargoMissionGrade"]) {
  assert.ok(end.includes(token), `écran de fin V5 incomplet: ${token}`);
}

// Étape 2 : dashboard Stats CARGO V4 massif. L’historique détaillé reste pour l’étape 3.
const cargoStatsPage = read("src/components/stats/CargoStatsTabFull.tsx");
for (const token of ["CENTRE DE PERFORMANCES V4","FORME RÉCENTE","POSITION DANS LA VOLÉE","SÉCURITÉ LOGISTIQUE","VARIANTES CARGO","DERNIÈRES MISSIONS"]) {
  assert.ok(cargoStatsPage.includes(token), `stats CARGO V4 incomplètes: ${token}`);
}
const historyCard = read("src/components/history/CargoHistoryScoreBlock.tsx");
for (const token of ["PRÉCISION","CONTRATS","SÉRIE"]) assert.ok(historyCard.includes(token), `carte historique existante incomplète: ${token}`);

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
assert.ok(compact.includes("winnerTeamIds"), "équipes CARGO absentes du codec");
const normalized = read("src/lib/statsNormalized.ts");
assert.ok(normalized.includes('return "cargo"'), "normalisation CARGO absente");
const games = read("src/pages/Games.tsx");
assert.ok(games.includes('"cargo",\n      "darts_poker"'), "ticker NEW GAME CARGO absent");

console.log("✅ CARGO INTEGRATION CONTRACT OK");
