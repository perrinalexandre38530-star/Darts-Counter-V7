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

const { commitDartsPokerProgress, readDartsPokerProgress, DARTS_POKER_BADGE_RULES, getDartsPokerBadgeProgress, reconcileDartsPokerProgressFromHistory } = await import("../src/lib/dartsPokerProgress.ts");

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




// Reconstruction depuis l'Historique : le cache local peut être vide après un nettoyage
// ou sur un appareil où les parties ont été restaurées/synchronisées.
mem.clear();
const historyRecords = Array.from({ length: 10 }, (_, index) => ({
  id: `history-${index + 1}`,
  matchId: `history-${index + 1}`,
  mode: "darts_poker",
  kind: "darts_poker",
  status: "finished",
  finishedAt: 1_700_000_000_000 + index * 1000,
  winnerId: "p-sync",
  winnerIds: ["p-sync"],
  summary: {
    kind: "darts_poker",
    mode: "darts_poker",
    finished: true,
    perPlayer: [{
      id: "p-sync",
      playerId: "p-sync",
      name: "Synced",
      darts: 6,
      hits: 5,
      contractHits: index < 5 ? 5 : 0,
      choicesUsed: 2,
      exchangesUsed: 1,
      jokers: index < 5 ? 2 : 0,
      premiumHands: index < 5 ? 2 : 0,
      leadRounds: 3,
      handsPlayed: 5,
      dealerWins: index < 5 ? 1 : 0,
      closingRoundWin: index < 5,
      royalFlushes: index === 0 ? 1 : 0,
    }],
  },
}));
const recovered = reconcileDartsPokerProgressFromHistory(historyRecords);
assert.equal(recovered.inspectedMatches, 10, "10 parties Darts Poker doivent être relues");
assert.equal(recovered.processedMatches, 10, "les 10 parties absentes du cache doivent être récupérées");
const recoveredCareer = readDartsPokerProgress("p-sync");
assert.equal(recoveredCareer?.matches, 10, "la carrière doit être reconstruite depuis l'historique");
assert.equal(recoveredCareer?.wins, 10, "les victoires doivent être reconstruites depuis l'historique");
assert.ok(recoveredCareer?.badges?.table_regular, "TABLE REGULAR doit être récupéré depuis l'historique");
assert.ok(recoveredCareer?.badges?.shark, "SHARK doit être récupéré depuis l'historique");
assert.ok(recoveredCareer?.badges?.royal, "ROYAL doit être récupéré depuis l'historique");
assert.equal(recoveredCareer?.badges?.first_deal?.unlockedAt, historyRecords[0].finishedAt, "la date du badge reconstruit doit suivre la partie d'origine");
const secondRecovery = reconcileDartsPokerProgressFromHistory(historyRecords);
assert.equal(secondRecovery.processedMatches, 0, "la réconciliation History doit rester idempotente");


// Le ledger de matchs ne doit plus oublier les anciennes parties au-delà de 80 entrées.
mem.clear();
const longHistory = Array.from({ length: 100 }, (_, index) => ({
  id: `long-${index + 1}`,
  matchId: `long-${index + 1}`,
  mode: "darts_poker",
  status: "finished",
  finishedAt: 1_710_000_000_000 + index * 1000,
  winnerIds: ["p-long"],
  summary: {
    finished: true,
    config: { botIds: ["bot-1"] },
    perPlayer: [
      { id: "p-long", name: "Long", darts: 6, hits: 4 },
      { id: "bot-1", name: "CPU", darts: 6, hits: 6 },
    ],
  },
}));
const longRecovery = reconcileDartsPokerProgressFromHistory(longHistory);
assert.equal(longRecovery.processedMatches, 100, "les 100 parties doivent être prises en compte une seule fois");
assert.equal(readDartsPokerProgress("p-long")?.matches, 100, "la carrière longue doit conserver tous les matchs traités");
assert.equal(readDartsPokerProgress("p-long")?.processedMatchIds.length, 100, "le ledger ne doit pas tronquer à 80 matchs");
assert.equal(readDartsPokerProgress("bot-1"), null, "les bots restaurés depuis History ne doivent jamais recevoir de progression");
const longSecondPass = reconcileDartsPokerProgressFromHistory(longHistory);
assert.equal(longSecondPass.processedMatches, 0, "la seconde passe sur 100 matchs doit rester idempotente");
assert.equal(readDartsPokerProgress("p-long")?.matches, 100, "aucun doublon ne doit apparaître après réconciliation");

const gallerySource = fs.readFileSync(new URL("../src/components/darts-poker/DartsPokerBadgeGallery.tsx", import.meta.url), "utf8");
const configSource = fs.readFileSync(new URL("../src/pages/DartsPokerConfig.tsx", import.meta.url), "utf8");
const endSource = fs.readFileSync(new URL("../src/pages/DartsPokerEnd.tsx", import.meta.url), "utf8");
const revealSource = fs.readFileSync(new URL("../src/components/darts-poker/DartsPokerBadgeUnlockReveal.tsx", import.meta.url), "utf8");
assert.match(gallerySource, /DARTS_POKER_BADGE_RULES/, "la galerie doit utiliser le catalogue de règles centralisé");
assert.match(gallerySource, /reconcileDartsPokerProgressFromHistory/, "la galerie doit pouvoir reconstruire la progression depuis History");
assert.match(configSource, /12 BADGES · PROGRESSION/, "la configuration doit ouvrir la galerie de badges");
assert.match(endSource, /COLLECTION & PROGRESSION DES BADGES/, "la fin de match doit exposer la collection de badges");
assert.match(endSource, /DartsPokerBadgeUnlockReveal/, "la fin de match doit lancer la cérémonie de déblocage");
assert.match(revealSource, /NOUVEAU BADGE DÉBLOQUÉ/, "la cérémonie de badge doit être explicite");

console.log("Darts Poker progress: OK");
