#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));
const required = [
  "src/lib/gameEngines/oceanControlEngine.ts",
  "src/pages/OceanControlConfig.tsx",
  "src/pages/OceanControlPlay.tsx",
  "src/pages/OceanControlEnd.tsx",
  "src/components/stats/OceanControlStatsTabFull.tsx",
  "src/components/history/OceanControlHistoryScoreBlock.tsx",
  "src/styles/ocean-control-play.css",
  "src/assets/tickers/ticker_ocean_control.png",
];
for (const rel of required) assert.ok(exists(rel), `fichier OCEAN CONTROL manquant: ${rel}`);

const png = fs.readFileSync(path.join(root, "src/assets/tickers/ticker_ocean_control.png"));
assert.equal(png.readUInt32BE(16), 800, "ticker OCEAN CONTROL: largeur attendue 800");
assert.equal(png.readUInt32BE(20), 230, "ticker OCEAN CONTROL: hauteur attendue 230");

const engine = read("src/lib/gameEngines/oceanControlEngine.ts");
for (const token of ["classic", "tactical", "recruit", "captain", "admiral", "automatic", "manual", "teams", "playOceanControlVisit", "placeOceanControlShip", "pickOceanControlBotDarts", "buildOceanControlMatchStats", "resolveSonar", "resolvePrecisionStrike", "sonarScans", "battleHistory", "bestHitStreak", "perfectVisits", "oceanControlLatestSonarScan"]) {
  assert.ok(engine.includes(token), `moteur OCEAN CONTROL incomplet: ${token}`);
}

const config = read("src/pages/OceanControlConfig.tsx");
for (const token of ["CONFIGURATION GUIDÉE", "CONFIGURATION COMPLÈTE", "LANCER OCEAN CONTROL", "participantMode", "fleetPreset", "gridOrder", "placement", "scoreInputMethod", "winsNeeded", "BotPagedSelector", "TeamPagedSelector"]) {
  assert.ok(config.includes(token), `configuration OCEAN CONTROL incomplète: ${token}`);
}

const play = read("src/pages/OceanControlPlay.tsx");
for (const token of ["OceanControlEnd", "History as any).upsert(buildHistoryRecord(\"in_progress\")", "onFinish?.(buildHistoryRecord(\"finished\"), { navigate: false })", "Keypad", "DartboardClickable", "GRILLE ENNEMIE", "MA FLOTTE", "JOURNAL DE BORD", "selectOceanControlTarget", "CENTRE TACTIQUE", "ImpactFeedback", "HISTORIQUE SONAR", "oceanControlLatestSonarScan"]) {
  assert.ok(play.includes(token), `écran Play OCEAN CONTROL incomplet: ${token}`);
}

const app = read("src/App.tsx");
assert.ok(app.includes('case "ocean_control_config"'), "route config OCEAN CONTROL absente");
assert.ok(app.includes('case "ocean_control_play"'), "route play OCEAN CONTROL absente");
assert.ok(app.includes("<OceanControlPlay"), "écran OCEAN CONTROL non monté");

const registry = read("src/games/dartsGameRegistry.ts");
assert.ok(registry.includes('id: "ocean_control"'), "carte Games OCEAN CONTROL absente");
assert.ok(registry.includes('tab: "ocean_control_config"'), "carte OCEAN CONTROL non reliée");
assert.ok(registry.includes('label: "OCEAN CONTROL"'), "nom officiel OCEAN CONTROL absent");
assert.ok(registry.includes('category: "challenge"'), "OCEAN CONTROL doit être classé en DÉFI");

const stats = read("src/pages/StatsHub.tsx");
assert.ok(stats.includes('key: "ocean_control"'), "onglet StatsHub OCEAN CONTROL absent");
assert.ok(stats.includes("<OceanControlStatsTabFull"), "dashboard OCEAN CONTROL absent");
assert.ok(stats.includes('return "ocean_control"'), "classification StatsHub OCEAN CONTROL absente");

const history = read("src/pages/HistoryPage.tsx");
assert.ok(history.includes('go("ocean_control_play"'), "reprise OCEAN CONTROL absente de l’historique");
assert.ok(history.includes('initialStatsSubTab: "ocean_control"'), "raccourci stats OCEAN CONTROL absent de l’historique");
assert.ok(history.includes("OceanControlHistoryScoreBlock"), "carte historique OCEAN CONTROL enrichie absente");

const home = read("src/lib/homeModeStats.ts");
assert.ok(home.includes('case "ocean_control"'), "résumé HOME OCEAN CONTROL absent");
const compact = read("src/lib/matchCompactCodec.ts");
assert.ok(compact.includes('mode === "ocean_control"'), "codec compact OCEAN CONTROL absent");
assert.ok(compact.includes("stateSnapshot: ocean.stateSnapshot"), "restauration compacte OCEAN CONTROL absente");
const normalized = read("src/lib/statsNormalized.ts");
assert.ok(normalized.includes('return "ocean_control"'), "normalisation OCEAN CONTROL absente");
const games = read("src/pages/Games.tsx");
assert.ok(games.includes('"ocean_control"'), "mise en avant NEW GAME OCEAN CONTROL absente");

console.log("✅ OCEAN CONTROL INTEGRATION CONTRACT OK");
