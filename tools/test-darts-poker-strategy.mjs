import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const sourcePath = path.join(root, "src/lib/dartsPokerStrategy.ts");
const tempPath = path.join(root, "src/lib/__dartsPokerStrategy.node-test.ts");

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
    buildDartsPokerMarketStrategy,
    dartsPokerStraightPotential,
    summarizeDartsPokerMarketStrategy,
  } = await import(`${pathToFileURL(tempPath).href}?v=${Date.now()}`);

  const c = (rank, suit) => ({ id: `${suit}${rank}`, rank, suit });

  const royalSetup = {
    handsByPlayer: {
      p1: { cards: [c(10, "H"), c(11, "H"), c(12, "H"), c(13, "H")] },
    },
    market: {
      1: c(14, "H"),
      2: c(10, "C"),
      3: c(2, "C"),
    },
    roundContract: {
      key: "straight",
      label: "Suite ou mieux",
      description: "Former une suite.",
      bonusPoints: 1,
      minimumCategoryRank: 4,
    },
  };

  const strategy = buildDartsPokerMarketStrategy(royalSetup, "p1");
  assert.equal(strategy.length, 3);
  assert.equal(strategy[0].sector, 1, "l'As de coeur doit être la cible prioritaire");
  assert.equal(strategy[0].tier, "priority");
  assert.equal(strategy[0].tierLabel, "PRIORITÉ");
  assert.equal(strategy[0].contractMatch, true);
  assert.equal(strategy[0].tag, "CONTRAT ✓");
  assert.ok(strategy[0].reason.includes("Valide immédiatement"));
  assert.equal(dartsPokerStraightPotential(royalSetup.handsByPlayer.p1.cards), 4);
  assert.equal(dartsPokerStraightPotential([...royalSetup.handsByPlayer.p1.cards, c(14, "H")]), 5);

  const tripSetup = {
    handsByPlayer: {
      p1: { cards: [c(9, "S"), c(9, "H"), c(4, "D")] },
    },
    market: {
      1: c(9, "D"),
      2: c(13, "C"),
      3: c(2, "S"),
    },
    roundContract: null,
  };

  const tripStrategy = buildDartsPokerMarketStrategy(tripSetup, "p1");
  const nine = tripStrategy.find((row) => row.sector === 1);
  assert.ok(nine);
  assert.equal(nine.tier, "strong");
  assert.equal(nine.tag, "BRELAN");
  assert.ok(nine.reason.includes("brelan"));

  const summary = summarizeDartsPokerMarketStrategy(strategy);
  assert.equal(summary.total, 3);
  assert.ok(summary.priority >= 1);
  assert.equal(summary.contractOuts, 1);
  assert.ok(["TRÈS OUVERT", "FAVORABLE", "SERRÉ", "FERMÉ"].includes(summary.label));

  for (const row of strategy) {
    assert.ok(["priority", "strong", "useful", "neutral"].includes(row.tier));
    assert.ok(row.reason.length > 10);
  }

  console.log("Darts Poker strategy: OK");
} finally {
  try { fs.unlinkSync(tempPath); } catch {}
}
