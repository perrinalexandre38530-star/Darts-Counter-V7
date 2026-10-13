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
]) {
  assert.ok(src.includes(marker), `Gameplay UI marker missing: ${marker}`);
}

assert.ok(src.includes("state.phase === \"powers\"") && src.includes("<PowerPhasePanel"), "powers phase must have a dedicated gameplay panel");
assert.ok(src.includes("<Keypad") && !src.includes("function Keypad("), "Darts Poker must keep using the shared Keypad component");
assert.ok(src.includes("onSector={(sector: number) => addDart(sector)}"), "market cards must support direct sector entry");
assert.ok(src.includes("nextPlayerName={state.phase === \"throwing\""), "won-card feedback must announce the next player");

console.log("Darts Poker gameplay UI: OK");
