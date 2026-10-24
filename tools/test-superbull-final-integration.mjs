#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));
const mustInclude = (text, tokens, label) => {
  for (const token of tokens) assert.ok(text.includes(token), `${label}: manque ${token}`);
};

for (const rel of [
  "src/pages/SuperBullConfig.tsx",
  "src/pages/SuperBullPlay.tsx",
  "src/pages/SimpleRoundsPlay.tsx",
]) assert.ok(exists(rel), `SUPER BULL: fichier manquant ${rel}`);

const app = read("src/App.tsx");
const config = read("src/pages/SuperBullConfig.tsx");
const play = read("src/pages/SimpleRoundsPlay.tsx");
const history = read("src/pages/HistoryPage.tsx");
const stats = read("src/pages/StatsHub.tsx");
const rebuild = read("src/lib/stats/rebuildStatsFromHistory.ts");
const registry = read("src/games/dartsGameRegistry.ts");
const quick = read("src/lib/quickParty.ts");

mustInclude(app, [
  'case "super_bull_config"',
  'case "super_bull_play"',
  'onQuick={() => go("super_bull_config", { launchMode: "quick" })}',
  'onArcade={() => go("super_bull_config", { launchMode: "arcade" })}',
], "routes/prémenu");

mustInclude(config, [
  "PARTIE RAPIDE SUPER BULL",
  "SUPER BULL · ARCADE",
  "PlayerPagedSelector",
  "BotPagedSelector",
  "quickParty: true",
  "profileStatsDeferred: true",
  "overflow-y: auto !important",
], "configuration");

mustInclude(play, [
  'import superBullHero from "../assets/superbull/superbull_horizontal_hero.png"',
  "BULL25",
  "BULL50",
  "MISS",
  "History.upsert(liveRec)",
  'status: "in_progress"',
  'status: "finished"',
  "stateSnapshot",
  "superBullPositionStats",
  "superBullRanking",
  "rebuildSuperBullStateFromVisits",
  "undoSuperBullInput",
  "CORRIGER LA DERNIÈRE VOLÉE",
  "setGameOver(false)",
  "savedRef.current = false",
], "gameplay/reprise/correction");

assert.ok(play.includes('setPlayerIdx(playerCount > 0 ? completedVisits % playerCount : 0)'), "correction: joueur actif non restauré");
assert.ok(play.includes('setRoundIdx(playerCount > 0 ? Math.floor(completedVisits / playerCount) : 0)'), "correction: round non restauré");
assert.ok(play.includes('visitHistoryRef.current = nextHistory'), "correction: log de volées non restauré");

mustInclude(history, [
  "SuperBullHistoryScoreBlock",
  'super_bull_play',
  "PARTIES RAPIDES",
  "quickPartyParticipants",
  "normalizeTransferredQuickRecord",
], "historique");

mustInclude(stats, [
  'key: "super_bull"',
  "SUPER BULL",
  "D1",
  "D2",
  "D3",
], "Stats Center");

mustInclude(rebuild, [
  'super_bull: { mode: "super_bull"',
  'if (g.includes("super_bull")',
], "rebuild stats");

mustInclude(registry, [
  'id: "super_bull"',
  'tab: "super_bull_config"',
  '"super_bull",',
], "registre");

mustInclude(quick, ["isQuickPartyRecord", "quickPartyParticipants", "quickPartyProfileLinks"], "contrat Partie Rapide");

for (const [file, text] of [["SuperBullConfig.tsx", config], ["SimpleRoundsPlay.tsx", play]]) {
  assert.ok(!/bient[oô]t disponible|not implemented/i.test(text), `${file}: marqueur de mode incomplet détecté`);
}

console.log("✅ SUPER BULL FINAL INTEGRATION CONTRACT OK");
