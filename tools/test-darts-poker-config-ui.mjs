import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const configPath = path.join(root, "src/pages/DartsPokerConfig.tsx");
const src = fs.readFileSync(configPath, "utf8");

for (const marker of [
  "DARTS POKER EN 20 SECONDES",
  "1 FLÉCHETTE CHACUN",
  "20 CARTES",
  "6 FLÉCHETTES / JOUEUR",
  "COMPOSE TA TABLE",
  "CHOISIS LA DURÉE",
  "RÈGLES & POUVOIRS",
  "COMMENT SAISIR LES LANCERS ?",
  "TABLE PRÊTE",
  "ModeChoiceCard",
  "GameFlowPreview",
  "PowerStrip",
  "PokerRankingMini",
  "PRIORITÉ / BONNE / UTILE / FAIBLE",
  "dp-config-complete-grid",
]) {
  assert.ok(src.includes(marker), `Darts Poker config UI marker missing: ${marker}`);
}

assert.ok(src.includes("const dartsPerHand: 6 = 6"), "Darts Poker must keep exactly 6 darts per player/round");
assert.ok(src.includes("slice(0, 8)"), "Darts Poker must keep the 8-player selection cap");
assert.ok(src.includes("selectedIds.length <= 8"), "Darts Poker valid table must remain capped at 8 players");
assert.ok(src.includes("guidedCanAdvance") && src.includes("CHOISIS UN JOUEUR"), "guided mode must block progression until a player is selected");
assert.ok(src.includes("[3,5,7,10]"), "saved match formats must remain compatible with 3/5/7/10 rounds");
assert.ok(src.includes("powersEnabled") && src.includes("jokerEnabled") && src.includes("contractsEnabled") && src.includes("assistanceEnabled"), "existing gameplay options must remain configurable");
assert.ok(src.includes("scoreInputMethod") && src.includes('setScoreInputMethod("keypad")') && src.includes('setScoreInputMethod("dartboard")'), "both input methods must remain available");
assert.ok(src.includes("DartsPokerDeckGallery") && src.includes("DartsPokerBadgeGallery"), "deck and badge galleries must remain accessible");
assert.ok(src.includes('go("darts_poker_play", payload)'), "configuration must still launch the existing Darts Poker play route");

console.log("Darts Poker config UI: OK");
