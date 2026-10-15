import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const sourcePath = path.join(root, "src/lib/dartsPokerShowdown.ts");
const tempPath = path.join(root, "src/lib/__dartsPokerShowdown.node-test.ts");
const source = fs.readFileSync(sourcePath, "utf8");

fs.writeFileSync(
  tempPath,
  source.replace(
    '"./gameEngines/dartsPokerEngine"',
    '"./gameEngines/dartsPokerEngine.ts"',
  ),
  "utf8",
);

try {
  const {
    explainDartsPokerShowdown,
    getDartsPokerRoundPoints,
    getDartsPokerBestFiveIds,
  } = await import(`${pathToFileURL(tempPath).href}?v=${Date.now()}`);

  const card = (rank, suit) => ({ id: `${suit}${rank}`, rank, suit });

  const winnerEval = {
    category: "three_of_a_kind",
    categoryRank: 3,
    label: "Brelan de 9",
    score: 300090000,
    tiebreak: [9, 14, 8],
    bestFive: [card(9,"S"), card(9,"H"), card(9,"D"), card(14,"C"), card(8,"S")],
  };
  const runnerEval = {
    category: "two_pair",
    categoryRank: 2,
    label: "Double paire A et K",
    score: 200141300,
    tiebreak: [14, 13, 8],
    bestFive: [card(14,"S"), card(14,"H"), card(13,"D"), card(13,"C"), card(8,"H")],
  };

  const round = {
    round: 1,
    winnerIds: ["p1"],
    rows: [
      { playerId: "p1", rank: 1, tied: false, win: true, evaluation: winnerEval, cards: winnerEval.bestFive, bestFive: winnerEval.bestFive, contractCompleted: true, contractBonus: 1, pointsAwarded: 2 },
      { playerId: "p2", rank: 2, tied: false, win: false, evaluation: runnerEval, cards: runnerEval.bestFive, bestFive: runnerEval.bestFive, contractCompleted: false, contractBonus: 0, pointsAwarded: 0 },
    ],
    contract: { key: "pair", label: "Paire ou mieux", description: "", bonusPoints: 1 },
  };

  const explained = explainDartsPokerShowdown(round);
  assert.equal(explained.tie, false);
  assert.equal(explained.title, "Brelan de 9");
  assert.ok(explained.detail.includes("Brelan"));
  assert.ok(explained.detail.includes("Double paire"));

  const points = getDartsPokerRoundPoints(round.rows[0]);
  assert.deepEqual(points, { winPoints: 1, contractPoints: 1, total: 2 });

  const ids = getDartsPokerBestFiveIds(round.rows[0]);
  assert.equal(ids.size, 5);
  assert.ok(ids.has("S9"));

  const pairA = {
    category: "pair",
    categoryRank: 1,
    label: "Paire d’As",
    score: 100000,
    tiebreak: [14, 13, 10, 8],
    bestFive: [],
  };
  const pairK = {
    category: "pair",
    categoryRank: 1,
    label: "Paire de Rois",
    score: 90000,
    tiebreak: [13, 14, 10, 8],
    bestFive: [],
  };
  const tiebreakRound = {
    round: 2,
    winnerIds: ["p1"],
    rows: [
      { playerId: "p1", rank: 1, tied: false, win: true, evaluation: pairA, cards: [], bestFive: [], pointsAwarded: 1 },
      { playerId: "p2", rank: 2, tied: false, win: false, evaluation: pairK, cards: [], bestFive: [], pointsAwarded: 0 },
    ],
  };
  const tieBreakExplained = explainDartsPokerShowdown(tiebreakRound);
  assert.ok(tieBreakExplained.detail.includes("Même catégorie"));
  assert.ok(tieBreakExplained.comparison.includes("A bat K"));

  const tiedRound = {
    round: 3,
    winnerIds: ["p1", "p2"],
    rows: [
      { playerId: "p1", rank: 1, tied: true, win: true, evaluation: pairA, cards: [], bestFive: [], pointsAwarded: 1 },
      { playerId: "p2", rank: 1, tied: true, win: true, evaluation: pairA, cards: [], bestFive: [], pointsAwarded: 1 },
    ],
  };
  const tied = explainDartsPokerShowdown(tiedRound);
  assert.equal(tied.tie, true);
  assert.ok(tied.detail.includes("exactement le même score poker"));

  console.log("Darts Poker showdown: OK");
} finally {
  try { fs.unlinkSync(tempPath); } catch {}
}
