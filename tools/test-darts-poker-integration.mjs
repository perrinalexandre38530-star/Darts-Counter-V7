#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

const required = [
  "src/lib/gameEngines/dartsPokerEngine.ts",
  "src/pages/DartsPokerConfig.tsx",
  "src/pages/DartsPokerPlay.tsx",
  "src/pages/DartsPokerEnd.tsx",
  "src/components/stats/DartsPokerStatsTabFull.tsx",
  "src/assets/tickers/ticker_darts_poker.png",
];
for (const rel of required) assert.ok(exists(rel), `fichier Darts Poker manquant: ${rel}`);

const png = fs.readFileSync(path.join(root, "src/assets/tickers/ticker_darts_poker.png"));
assert.equal(png.readUInt32BE(16), 800, "le ticker doit faire 800 px de large");
assert.equal(png.readUInt32BE(20), 230, "le ticker doit faire 230 px de haut");

const app = read("src/App.tsx");
assert.ok(app.includes('case "darts_poker_config"'), "route config absente");
assert.ok(app.includes('case "darts_poker_play"'), "route play absente");
assert.ok(app.includes("<DartsPokerPlay"), "écran Play non monté");
assert.ok(app.includes('"darts_poker_play"'), "plein écran Play absent");

const registry = read("src/games/dartsGameRegistry.ts");
assert.ok(registry.includes('id: "darts_poker"'), "carte Games absente");
assert.ok(registry.includes('tab: "darts_poker_config"'), "carte Games non reliée à la config");

// Anti-régression menu Jeux : Darts Poker doit rester actif et classé dans Fun.
const pokerDefinition = registry.match(/\{\s*id:\s*"darts_poker"[\s\S]*?\n\s*\},/i)?.[0] || "";
assert.ok(pokerDefinition, "définition Darts Poker introuvable dans le registry");
assert.ok(pokerDefinition.includes('category: "fun"'), "Darts Poker doit être classé dans Fun");
assert.ok(pokerDefinition.includes('subCategory: "strategie"'), "sous-catégorie Stratégie absente");
assert.ok(pokerDefinition.includes('ready: true'), "Darts Poker ne doit pas être déclaré indisponible");

const readyIdsSection = registry.match(/const READY_IDS = new Set<string>\(\[[\s\S]*?\]\);/i)?.[0] || "";
assert.ok(readyIdsSection.includes('"darts_poker"'), "Darts Poker absent de READY_IDS : la carte serait grisée");

const play = read("src/pages/DartsPokerPlay.tsx");
assert.ok(play.includes("DartsPokerEnd"), "écran de fin non relié");
assert.ok(play.includes('History as any).upsert(buildHistoryRecord("in_progress")'), "autosauvegarde en cours absente");
assert.ok(play.includes('initialStatsSubTab: "darts_poker"'), "raccourci stats de fin absent");
assert.ok(play.includes("stateSnapshot"), "snapshot de reprise absent");
assert.ok(play.includes("hitsBySegment"), "télémétrie S/D/T absente");

const history = read("src/pages/HistoryPage.tsx");
assert.ok(history.includes('go("darts_poker_play"'), "reprise Historique absente");
assert.ok(history.includes('initialStatsSubTab: "darts_poker"'), "raccourci stats Historique absent");
assert.ok(history.includes('label: "DARTS POKER"'), "filtre Historique absent");

const summary = read("src/pages/DartsModeSummaryPage.tsx");
assert.ok(summary.includes("DartsPokerSummaryTables"), "carte Historique enrichie absente");
assert.ok(summary.includes("Showdowns"), "détail des showdowns absent");
assert.ok(summary.includes("Journal des volées"), "journal historique absent");

const statsHub = read("src/pages/StatsHub.tsx");
assert.ok(statsHub.includes('key: "darts_poker"'), "onglet StatsHub absent");
assert.ok(statsHub.includes("<DartsPokerStatsTabFull"), "dashboard stats dédié absent");

const home = read("src/lib/homeModeStats.ts");
assert.ok(home.includes('darts_poker: "DARTS POKER"'), "résumé HOME absent");
assert.ok(home.includes('case "darts_poker"'), "KPI HOME absents");

const compact = read("src/lib/matchCompactCodec.ts");
assert.ok(compact.includes('mode === "darts_poker"'), "codec compact non spécialisé");
assert.ok(compact.includes("stateSnapshot"), "état reprenable non conservé dans le compact");

const android = read("src/config/androidStoreV1.ts");
assert.ok(android.includes('"darts_poker"'), "mode absent de la version Android Store");

console.log("✅ DARTS POKER INTEGRATION CONTRACT OK");
