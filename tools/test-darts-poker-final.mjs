import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

const requiredFiles = [
  "src/pages/DartsPokerConfig.tsx",
  "src/pages/DartsPokerPlay.tsx",
  "src/pages/DartsPokerEnd.tsx",
  "src/lib/gameEngines/dartsPokerEngine.ts",
  "src/lib/dartsPokerStrategy.ts",
  "src/lib/dartsPokerShowdown.ts",
  "src/lib/dartsPokerProgress.ts",
  "src/components/darts-poker/DartsPokerCard.tsx",
  "src/components/darts-poker/DartsPokerBadge.tsx",
  "src/components/stats/DartsPokerStatsTabFull.tsx",
  "src/assets/tickers/ticker_darts_poker.png",
];
for (const rel of requiredFiles) assert.ok(exists(rel), `Darts Poker final: fichier manquant ${rel}`);

const config = read("src/pages/DartsPokerConfig.tsx");
const play = read("src/pages/DartsPokerPlay.tsx");
const engine = read("src/lib/gameEngines/dartsPokerEngine.ts");
const strategy = read("src/lib/dartsPokerStrategy.ts");
const showdown = read("src/lib/dartsPokerShowdown.ts");
const progress = read("src/lib/dartsPokerProgress.ts");

for (const marker of [
  "DARTS POKER EN 20 SECONDES",
  "6 FLÉCHETTES / JOUEUR",
  "1 fléchette → joueur suivant",
  "Même secteur = même carte",
  "PRIORITÉ",
  "BONNE",
  "UTILE",
  "FAIBLE",
  "LANCER LA PARTIE",
]) assert.ok(config.includes(marker), `Config final marker manquant: ${marker}`);

for (const marker of [
  "buildDartsPokerMarketStrategy",
  "explainDartsPokerShowdown",
  "GameplayMarketBoard",
  "PowerPhasePanel",
  "GameplayGuideModal",
  "GameplayTransitionToast",
  "MARCHÉ 1–20 · TOUCHE = CARTE",
  "TA MAIN · MEILLEURES 5 CARTES CALCULÉES AUTO",
  "NOUVEAU MARCHÉ · 20 NOUVELLES CIBLES",
  "TOP 5",
  "HORS TOP 5",
  "<Keypad",
]) assert.ok(play.includes(marker), `Play final marker manquant: ${marker}`);

assert.ok(!play.includes("function Keypad("), "Darts Poker doit conserver le Keypad global partagé");
assert.ok(play.includes("ticker_darts_poker.png"), "Le ticker PNG officiel doit rester utilisé");
assert.ok(!play.includes("ticker_darts_poker.svg"), "Aucun ticker SVG de remplacement ne doit être utilisé");

assert.ok(engine.includes("dartsPerHand"), "Le moteur doit porter dartsPerHand");
assert.ok(engine.includes("activePlayerIndex"), "Le moteur doit gérer l'alternance des joueurs");
assert.ok(engine.includes("evaluateBestPokerHand"), "Le moteur doit calculer la meilleure main");
assert.ok(engine.includes("exchangeTokens") && engine.includes("choiceTokens"), "Les pouvoirs doivent rester gérés par le moteur");
assert.ok(strategy.includes("priority") && strategy.includes("strong") && strategy.includes("useful") && strategy.includes("neutral"), "Le moteur stratégique doit classer les 20 cartes");
assert.ok(showdown.includes("explainDartsPokerShowdown") && showdown.includes("getDartsPokerBestFiveIds"), "Le showdown explicatif doit rester présent");
assert.ok(progress.includes("commitDartsPokerProgress") && progress.includes("processedMatchIds"), "La progression persistante et anti-doublon doit rester présente");

console.log("✅ DARTS POKER FINAL AUDIT OK");
