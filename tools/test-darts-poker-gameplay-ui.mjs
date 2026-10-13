import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const playPath = path.join(root, "src/pages/DartsPokerPlay.tsx");
const src = fs.readFileSync(playPath, "utf8");

for (const marker of [
  "GameplayMarketBoard",
  "GameplayLegend",
  "PowerPhasePanel",
  "GameplayGuideModal",
  "describeSelectedPokerHit",
  "1 FLÉCHETTE CHACUN",
  "MARCHÉ 1–20 · TOUCHE = CARTE",
  "PHASE POUVOIRS",
  "TA MAIN · MEILLEURES 5 CARTES CALCULÉES AUTO",
  "dc_darts_poker_gameplay_guide_v1",
  "GameplayTransitionToast",
  "DartsPokerMotionStyles",
  "MarketRefreshFlash",
  "SECTEUR {marketRefresh.sector} RENOUVELÉ",
  "TOP 5",
  "HORS TOP 5",
  "5 cartes retenues",
  "NOUVEAU MARCHÉ · 20 NOUVELLES CIBLES",
]) {
  assert.ok(src.includes(marker), `Gameplay UI marker missing: ${marker}`);
}

assert.ok(src.includes("state.phase === \"powers\"") && src.includes("<PowerPhasePanel"), "powers phase must have a dedicated gameplay panel");
assert.ok(src.includes("<Keypad") && !src.includes("function Keypad("), "Darts Poker must keep using the shared Keypad component");
assert.ok(src.includes("onSector={(sector: number) => addDart(sector)}"), "market cards must support direct sector entry");
assert.ok(src.includes("nextPlayerName={state.phase === \"throwing\""), "won-card feedback must announce the next player");
assert.ok(src.includes("className={refreshed ? \"dp-market-refresh\" : \"\"}"), "renewed market sector must be animated");
assert.ok(src.includes("activeBestFiveIds") && src.includes("hasBestFiveSelection"), "live hand must identify the retained best five");
assert.ok(src.includes("previousTurnRef") && src.includes("setTurnTransition"), "turn changes must trigger dedicated feedback");
assert.ok(src.includes("setPhaseTransition") && src.includes("LANCERS TERMINÉS"), "phase changes must trigger dedicated feedback");

console.log("Darts Poker gameplay UI: OK");
