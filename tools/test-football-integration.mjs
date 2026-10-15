import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

for (const file of [
  "src/lib/gameEngines/footballEngine.ts",
  "src/pages/FootballConfig.tsx",
  "src/pages/FootballPlay.tsx",
  "src/pages/FootballEnd.tsx",
  "src/styles/football-play.css",
  "src/styles/football-config.css",
  "src/components/stats/FootballStatsTabFull.tsx",
  "src/components/history/FootballHistoryScoreBlock.tsx",
  "src/lib/footballInsights.ts",
]) assert.ok(exists(file), `${file} absent`);

const engine = read("src/lib/gameEngines/footballEngine.ts");
for (const token of ["createFootballState", "playFootballVisit", "goalkeeper", "penalties", "buildFootballMatchStats", "pickFootballBotDarts"]) assert.ok(engine.includes(token), `moteur incomplet: ${token}`);

const config = read("src/pages/FootballConfig.tsx");
for (const token of ["PlayerPagedSelector", "TeamPagedSelector", "BotPagedSelector", "golden_goal", "penalties", "classic", "football_play", "football-config-summary", "Clavier compact", "applyPreset"]) assert.ok(config.includes(token), `configuration incomplète: ${token}`);

const play = read("src/pages/FootballPlay.tsx");
for (const token of ["Keypad", "DartboardClickable", "FootballField", "FootballEnd", "History", "buildDartsTelemetry", "stateSnapshot", "onFinish", "CompactFootballPad", "football-compact-pad", "MissionCard", "football-quick-actions", "football-transition", "sideEfficiency", "buildFootballMomentumFromState", "NOTE LIVE", "football-momentum"]) assert.ok(play.includes(token), `écran de jeu incomplet: ${token}`);

const app = read("src/App.tsx");
assert.match(app, /case\s+["']football_config["']/);
assert.match(app, /case\s+["']football_play["']/);
assert.ok(app.includes("<FootballConfig store={store}"), "store non transmis à FootballConfig");
assert.ok(app.includes("<FootballPlay"), "FootballPlay non monté");

const registry = read("src/games/dartsGameRegistry.ts");
assert.ok(registry.includes("Football"));
assert.match(
  registry,
  /const READY_IDS = new Set<string>\(\[[\s\S]*?["']football["'][\s\S]*?\]\);/,
  "Football absent de READY_IDS : la carte serait affichée comme Bientôt disponible"
);
assert.ok(!/football[\s\S]{0,500}A implementer/i.test(registry), "la carte Football est encore marquée à implémenter");

const stats = read("src/pages/StatsHub.tsx");
for (const token of ["FootballStatsTabFull", 'key: "football"', 'currentMode === "football"', 'initialStatsSubTab?:']) assert.ok(stats.includes(token), `StatsHub non câblé: ${token}`);

const history = read("src/pages/HistoryPage.tsx");
for (const token of ["FootballHistoryScoreBlock", "isFootballEntry", 'safeGo(["football_play"]', 'initialStatsSubTab: "football"']) assert.ok(history.includes(token), `Historique non câblé: ${token}`);

const footballStats = read("src/components/stats/FootballStatsTabFull.tsx");
for (const token of ["Efficacité par phase", "Volées attaque", "Volées défense", "Volées gardien", "Records personnels Darts Football", "Progression carrière", "Note moyenne", "buildFootballCareerProgress", "ADN tactique", "Carte de cible Football", "buildFootballSectorProfileFromRecords", "footballTacticalProfile", "buildFootballCareerHonours", "Palmarès avancé"]) assert.ok(footballStats.includes(token), `Stats Football V7 incomplètes: ${token}`);

const footballEnd = read("src/pages/FootballEnd.tsx");
for (const token of ["CLEAN SHEET", "CONVERSION", "PRÉCISION", "matchBadges", "PALIERS DE CARRIÈRE", "footballPerformanceRating", "ADN TACTIQUE DU MATCH", "ZONES CHAUDES", "buildFootballSectorProfileFromState", "DISTINCTIONS DU MATCH", "footballMatchHonoursFromState", "buildFootballMomentumFromState"]) assert.ok(footballEnd.includes(token), `Fin Football V7 incomplète: ${token}`);

const footballHistory = read("src/components/history/FootballHistoryScoreBlock.tsx");
for (const token of ["★ MVP", "⚽ BUTEUR", "🧤 GARDIEN", "📈 NOTE", "footballPerformanceRating", "ADN DU MVP", "ZONE FORTE", "buildFootballSectorProfileFromRecord", "footballMatchHonoursFromState", "DYNAMIQUE"]) assert.ok(footballHistory.includes(token), `Carte historique Football V7 incomplète: ${token}`);

const footballInsights = read("src/lib/footballInsights.ts");
for (const token of ["footballPerformanceRating", "buildFootballCareerSnapshot", "buildFootballCareerProgress", "footballCareerMilestonesUnlocked", "footballTacticalProfile", "buildFootballSectorProfileFromVisits", "buildFootballSectorProfileFromRecord", "buildFootballSectorProfileFromRecords", "buildFootballMomentumFromState", "footballMatchHonoursFromState", "buildFootballCareerHonours"]) assert.ok(footballInsights.includes(token), `Insights Football V7 incomplets: ${token}`);

const codec = read("src/lib/matchCompactCodec.ts");
for (const token of ['mode === "football_darts"', "stateSnapshot", "footballVisits", "compact.d?.fb"]) assert.ok(codec.includes(token), `codec compact non câblé: ${token}`);

console.log("DARTS FOOTBALL integration wiring: OK");

const footballPlayCss = read("src/styles/football-play.css");
for (const token of ["football-scoreboard", "football-field__ball", "football-command-row", "football-compact-pad", "football-pad-cell.is-target", "football-match-ticker", "football-momentum"]) assert.ok(footballPlayCss.includes(token), `CSS FootballPlay incomplet: ${token}`);
const footballConfigCss = read("src/styles/football-config.css");
for (const token of ["football-config-summary", "football-mode-grid", "football-config-actions"]) assert.ok(footballConfigCss.includes(token), `CSS FootballConfig incomplet: ${token}`);
