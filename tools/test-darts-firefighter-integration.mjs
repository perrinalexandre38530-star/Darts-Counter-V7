#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

const required = [
  "src/lib/gameEngines/dartsFirefighterEngine.ts",
  "src/pages/DartsFirefighterConfig.tsx",
  "src/pages/DartsFirefighterPlay.tsx",
  "src/pages/DartsFirefighterEnd.tsx",
  "src/pages/StatsDartsFirefighter.tsx",
  "src/lib/dartsFirefighterStats.ts",
  "src/assets/tickers/ticker_darts_firefighter.png",
];
for (const rel of required) assert.ok(exists(rel), `fichier Darts Firefighter manquant: ${rel}`);

const png = fs.readFileSync(path.join(root, "src/assets/tickers/ticker_darts_firefighter.png"));
assert.equal(png.readUInt32BE(16), 800, "le ticker doit faire 800 px de large");
assert.equal(png.readUInt32BE(20), 230, "le ticker doit faire 230 px de haut");


const configPage = read("src/pages/DartsFirefighterConfig.tsx");
for (const token of [
  "CONFIGURATION GUIDÉE",
  "CONFIGURATION COMPLÈTE",
  "Intervention express",
  "Feu de forêt",
  "Protection civile",
  "Survie Inferno",
  "propagationTiming",
  "initialFireLevel",
  "initialSmoke",
  "firePlacement",
  "windStrength",
  "dartsPerTurn",
  "canadairRequiresGauge",
]) assert.ok(configPage.includes(token), `configuration V2 incomplète: ${token}`);

const engine = read("src/lib/gameEngines/dartsFirefighterEngine.ts");
for (const token of ["objective_complete", "after_round", "initialSmoke", "targetOrder", "canadairGaugeCost", "normalizeDartsFirefighterConfig"]) {
  assert.ok(engine.includes(token), `moteur V2 non câblé: ${token}`);
}

const app = read("src/App.tsx");
assert.ok(app.includes('case "darts_firefighter_config"'), "route config absente");
assert.ok(app.includes('case "darts_firefighter_play"'), "route play absente");
assert.ok(app.includes("<DartsFirefighterPlay"), "écran Play non monté");

const registry = read("src/games/dartsGameRegistry.ts");
assert.ok(registry.includes('id: "darts_firefighter"'), "carte Games absente");
assert.ok(registry.includes('tab: "darts_firefighter_config"'), "carte Games non reliée à la config");

const play = read("src/pages/DartsFirefighterPlay.tsx");
assert.ok(play.includes("DartsFirefighterEnd"), "écran de fin non relié");
assert.ok(play.includes('History as any).upsert(buildHistoryRecord("in_progress")'), "autosauvegarde en cours absente");
assert.ok(play.includes('onFinish?.(record, { navigate: false })'), "sauvegarde finale absente");
for (const token of [
  'ScoreInputHub',
  '6.2.0-map-visible-assets-kpi',
  'CompactInfoCard',
  'FirefighterMapCard',
  'FirefighterMapModal',
  'ObjectiveModal',
  'TerritoryModal',
  'StatsModal',
  'OutlineIcon',
  'Cible Bull / Canadair désélectionnée',
  'selectedTerritoryId = null',
  'tickerHeight={68}',
  'CARTE D’INTERVENTION',
  'dff-play__map-flag-background',
  'ACTION CONSEILLÉE',
]) assert.ok(play.includes(token), `refonte Play V6 manquante: ${token}`);
assert.ok(!play.includes('height: "min(47vh,410px)"'), "ancienne grande carte permanente encore présente");

const history = read("src/pages/HistoryPage.tsx");
assert.ok(history.includes("DartsFirefighterHistoryScoreBlock"), "carte Historique enrichie absente");
assert.ok(history.includes('go("darts_firefighter_play"'), "reprise Historique absente");
assert.ok(history.includes('initialStatsSubTab: "darts_firefighter"'), "raccourci stats Historique absent");

const statsHub = read("src/pages/StatsHub.tsx");
assert.ok(statsHub.includes('key: "darts_firefighter"'), "onglet StatsHub absent");
assert.ok(statsHub.includes("<StatsDartsFirefighter"), "dashboard stats dédié absent");

const compact = read("src/lib/matchCompactCodec.ts");
assert.ok(compact.includes('mode === "darts_firefighter"'), "codec compact non spécialisé");
assert.ok(compact.includes("stateSnapshot"), "état reprenable non conservé dans le compact");

console.log("✅ DARTS FIREFIGHTER INTEGRATION CONTRACT OK");
