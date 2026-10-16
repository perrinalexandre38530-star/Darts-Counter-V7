import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));
const mustInclude = (text, tokens, label) => {
  for (const token of tokens) assert.ok(text.includes(token), `${label}: manque ${token}`);
};

const app = read("src/App.tsx");
const registry = read("src/games/dartsGameRegistry.ts");
const config = read("src/pages/FootballConfig.tsx");
const play = read("src/pages/FootballPlay.tsx");
const end = read("src/pages/FootballEnd.tsx");
const engine = read("src/lib/gameEngines/footballEngine.ts");
const insights = read("src/lib/footballInsights.ts");
const stats = read("src/components/stats/FootballStatsTabFull.tsx");
const history = read("src/components/history/FootballHistoryScoreBlock.tsx");
const configCss = read("src/styles/football-config.css");
const playCss = read("src/styles/football-play.css");

mustInclude(registry, [
  'id: "football"',
  'tab: "football_config"',
  'ready: true',
  'supportsTeams: true',
  'supportsBots: true',
  '"football",',
], "registre Darts Football");
mustInclude(app, ['case "football_config"', 'case "football_play"', 'const FootballConfig', 'const FootballPlay'], "routes Football");

mustInclude(config, [
  "CONFIGURATION GUIDÉE",
  "TOUS LES RÉGLAGES",
  "7 · VÉRIFIE ET JOUE",
  "CONFIGURATION VALIDE",
  "FOOTBALL_BUILTIN_PRESETS",
  "loadFootballCustomPresets",
  "participantMode",
  "goalkeeperEnabled",
  "missLosesPossession",
  "targetDifficulty",
  "scoreInputMethod",
], "configuration finale");

mustInclude(play, [
  "DARTS FOOTBALL V13",
  "PLAN CONSEILLÉ",
  "APERÇU SI TU VALIDES MAINTENANT",
  "VOLÉE PRÉCÉDENTE",
  "TON ACTION",
  "footballTacticalRecommendation",
  "footballInputProjection",
  "FootballField",
  "CompactFootballPad",
  "buildHistoryRecord",
  "History as any",
  "buildFootballMomentumFromState",
  "NOTE LIVE",
], "gameplay final");

mustInclude(end, [
  "PALIERS DE CARRIÈRE",
  "DISTINCTIONS DU MATCH",
  "ADN TACTIQUE DU MATCH",
  "ZONES CHAUDES",
  "CLEAN SHEET",
], "écran de fin");
mustInclude(stats, [
  "Records personnels Darts Football",
  "Progression carrière",
  "ADN tactique",
  "Carte de cible Football",
  "Palmarès avancé",
], "centre de statistiques");
mustInclude(history, [
  "footballPerformanceRating",
  "footballTacticalProfile",
  "footballMatchHonoursFromState",
], "historique Football");
mustInclude(insights, [
  "buildFootballCareerProgress",
  "footballTacticalProfile",
  "buildFootballMomentumFromState",
  "footballMatchHonoursFromState",
  "buildFootballCareerHonours",
], "insights Football");
mustInclude(engine, [
  '"match"', '"golden_goal"', '"first_to"', '"penalties"', '"classic"',
  "playFootballVisit", "pickFootballBotDarts", "cloneFootballState", "buildFootballMatchStats",
], "moteur Football");

assert.ok(exists("src/assets/tickers/ticker_football.png"), "ticker Football absent");
assert.ok(configCss.length > 5000, "CSS config Football anormalement réduit");
assert.ok(playCss.length > 12000, "CSS gameplay Football anormalement réduit");

for (const [file, text] of [
  ["FootballConfig.tsx", config], ["FootballPlay.tsx", play], ["FootballEnd.tsx", end],
  ["footballEngine.ts", engine], ["footballInsights.ts", insights],
]) {
  assert.ok(!/\bTODO\b|\bFIXME\b|bient[oô]t disponible|not implemented/i.test(text), `${file}: marqueur de travail inachevé détecté`);
}

console.log("DARTS FOOTBALL FINAL release guard: OK");
