import assert from "node:assert/strict";
import fs from "node:fs";

const mem = new Map<string, string>();
(globalThis as any).window = {
  localStorage: {
    getItem: (key: string) => mem.get(key) ?? null,
    setItem: (key: string, value: string) => mem.set(key, String(value)),
    removeItem: (key: string) => mem.delete(key),
  },
};

const { commitDartsPokerProgress, readDartsPokerProgress, DARTS_POKER_BADGE_RULES, getDartsPokerBadgeProgress } = await import("../src/lib/dartsPokerProgress.ts");

const stats = {
  darts: 60,
  hits: 48,
  contractHits: 25,
  choicesUsed: 13,
  exchangesUsed: 12,
  jokers: 10,
  premiumHands: 10,
  leadRounds: 6,
  handsPlayed: 10,
  dealerWins: 5,
  closingRoundWin: true,
  royalFlushes: 1,
};

let result = commitDartsPokerProgress({
  matchId: "m1",
  winnerIds: ["p1"],
  participants: [{ id: "p1", name: "Alice", stats }],
});

const unlocked = new Set(result.unlocks.map((row: any) => row.badgeId));
for (const id of ["first_deal", "sniper", "contract_master", "power_player", "joker_master", "premium_hand", "table_leader", "winning_dealer", "royal"]) {
  assert.ok(unlocked.has(id), `badge non débloqué: ${id}`);
}
assert.ok(!unlocked.has("table_regular"));
assert.ok(!unlocked.has("shark"));
assert.ok(!unlocked.has("closer"));

result = commitDartsPokerProgress({
  matchId: "m1",
  winnerIds: ["p1"],
  participants: [{ id: "p1", name: "Alice", stats }],
});
assert.equal(result.unlocks.length, 0, "un même match ne doit pas redébloquer les badges");
assert.equal(readDartsPokerProgress("p1")?.matches, 1, "un même match ne doit pas être compté deux fois");

for (let i = 2; i <= 10; i++) {
  result = commitDartsPokerProgress({
    matchId: `m${i}`,
    winnerIds: ["p1"],
    participants: [{ id: "p1", name: "Alice", stats: { darts: 1, hits: 1, closingRoundWin: i <= 5 } }],
  });
}

const career = readDartsPokerProgress("p1");
assert.equal(career?.matches, 10);
assert.equal(career?.wins, 10);
assert.ok(career?.badges?.table_regular, "badge TABLE REGULAR absent après 10 parties");
assert.ok(career?.badges?.shark, "badge SHARK absent après 10 victoires");
assert.ok(career?.badges?.closer, "badge CLOSER absent après 5 fins gagnées");


assert.equal(DARTS_POKER_BADGE_RULES.length, 12, "le catalogue doit contenir exactement 12 badges");
const sharkProgress = getDartsPokerBadgeProgress("p1", "shark");
assert.equal(sharkProgress.unlocked, true, "SHARK doit être persistant après 10 victoires");
assert.equal(sharkProgress.target, 10);
assert.equal(sharkProgress.current, 10);
const regularProgress = getDartsPokerBadgeProgress("p1", "table_regular");
assert.equal(regularProgress.unlocked, true, "TABLE REGULAR doit être persistant après 10 parties");
assert.equal(regularProgress.percent, 100);


const gallerySource = fs.readFileSync(new URL("../src/components/darts-poker/DartsPokerBadgeGallery.tsx", import.meta.url), "utf8");
const configSource = fs.readFileSync(new URL("../src/pages/DartsPokerConfig.tsx", import.meta.url), "utf8");
const endSource = fs.readFileSync(new URL("../src/pages/DartsPokerEnd.tsx", import.meta.url), "utf8");
assert.match(gallerySource, /DARTS_POKER_BADGE_RULES/, "la galerie doit utiliser le catalogue de règles centralisé");
assert.match(configSource, /12 BADGES · PROGRESSION/, "la configuration doit ouvrir la galerie de badges");
assert.match(endSource, /COLLECTION & PROGRESSION DES BADGES/, "la fin de match doit exposer la collection de badges");

console.log("Darts Poker progress: OK");
