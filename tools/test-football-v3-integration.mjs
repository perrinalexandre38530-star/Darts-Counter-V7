import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const required = [
  "src/lib/gameEngines/footballEngine.ts",
  "src/pages/FootballConfig.tsx",
  "src/pages/FootballPlay.tsx",
  "src/pages/FootballEnd.tsx",
  "src/styles/football-config.css",
  "src/styles/football-play.css",
  "src/components/stats/FootballStatsTabFull.tsx",
  "src/components/history/FootballHistoryScoreBlock.tsx",
];
for (const file of required) assert.ok(exists(file), `${file} absent`);

const engine = read("src/lib/gameEngines/footballEngine.ts");
for (const token of ["first_to", "goalTarget", "penaltyShots", "mercyGoals", "targetDifficulty", "kickoffMode", "coachHints", "clearances", "counterAttacks", "penaltiesScored"]) assert.ok(engine.includes(token), `moteur incomplet: ${token}`);

const config = read("src/pages/FootballConfig.tsx");
for (const token of ["MATCH", "GOLDEN GOAL", "PREMIER À X", "TIRS AU BUT", "CLASSIC", "Mercy rule", "Difficulté des secteurs", "Coach tactique", "Coup d’envoi"]) assert.ok(config.includes(token), `configuration incomplète: ${token}`);

const play = read("src/pages/FootballPlay.tsx");
for (const token of ["football-live-strip", "TABLEAU DU MATCH", "FEUILLE DE MATCH", "records", "buildMatchHighlights", "CompactFootballPad", "FootballEnd"]) assert.ok(play.includes(token), `jeu incomplet: ${token}`);

const end = read("src/pages/FootballEnd.tsx");
for (const token of ["JOUEUR DU MATCH", "STATS MATCH", "MEILLEUR BUTEUR", "MEILLEUR GARDIEN", "CHRONOLOGIE DES BUTS", "STATISTIQUES & RECORDS"]) assert.ok(end.includes(token), `écran de fin incomplet: ${token}`);

const stats = read("src/components/stats/FootballStatsTabFull.tsx");
for (const token of ["Records personnels Darts Football", "SÉRIE DE VICTOIRES", "Forme récente", "Variantes", "Parties récentes"]) assert.ok(stats.includes(token), `statistiques incomplètes: ${token}`);

const history = read("src/components/history/FootballHistoryScoreBlock.tsx");
for (const token of ["penaltyAttemptsBySide", "VAINQUEUR", "TIRS", "CADRÉS", "INTERCEPT."]) assert.ok(history.includes(token), `historique incomplet: ${token}`);

console.log("DARTS FOOTBALL V3 integration: OK");
