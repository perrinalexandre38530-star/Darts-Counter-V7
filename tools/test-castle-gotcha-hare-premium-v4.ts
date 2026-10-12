import assert from "node:assert/strict";
import { createCastleState, assignCastleNumber, playCastleVisit } from "../lib/gameEngines/castleEngine.ts";
import { createGotchaState, playGotchaVisit } from "../lib/gameEngines/gotchaEngine.ts";
import { createHareState, playHareVisit, hareCurrentSegment } from "../lib/gameEngines/hareHoundsEngine.ts";

const players = [{ id: "p1", name: "A" }, { id: "p2", name: "B" }];

// CASTLE — attribution, construction, attaque et stats enrichies.
let castle = createCastleState(players, {
  mode: "castle", selectedIds: ["p1", "p2"], players: 2, botLevel: "normal", seriesWins: 1,
  sfxEnabled: true, awenaEnabled: true, coachEnabled: true,
  rules: { targetBricks: 10, numberAssignment: "offhand", attacksEnabled: true, reassignEachLeg: false },
});
castle = assignCastleNumber(castle, { bed: "S", number: 20 });
castle = assignCastleNumber(castle, { bed: "S", number: 5 });
assert.equal(castle.phase, "playing");
assert.equal(castle.targets.p1, 20);
assert.equal(castle.targets.p2, 5);
castle = playCastleVisit(castle, [{ bed: "T", number: 20 }, { bed: "D", number: 5 }, { bed: "MISS" }]);
assert.equal(castle.bricks.p1, 3, "T20 doit construire 3 briques");
assert.equal(castle.statsByPlayer.p1.builds, 3);
assert.equal(castle.statsByPlayer.p1.damage, 0, "un château adverse vide ne peut pas descendre sous zéro");
assert.equal(castle.statsByPlayer.p1.usefulHits, 2);
assert.equal(castle.statsByPlayer.p1.triples, 1);
assert.equal(castle.statsByPlayer.p1.doubles, 1);
assert.equal(castle.statsByPlayer.p1.misses, 1);
assert.equal(castle.visits.at(-1)?.usefulHits, 2);

// GOTCHA — GOTCHA multi-adversaire, stats, bust et finish exact.
let gotcha = createGotchaState(players, {
  mode: "gotcha", selectedIds: ["p1", "p2"], players: 2, botLevel: "normal", seriesWins: 1,
  sfxEnabled: true, awenaEnabled: true, coachEnabled: true,
  rules: { targetScore: 201, outMode: "straight", maxRounds: 0, bustRule: "turn" },
});
gotcha.scores.p2 = 60;
gotcha = playGotchaVisit(gotcha, [{ bed: "T", number: 20 }]);
assert.equal(gotcha.scores.p1, 60);
assert.equal(gotcha.scores.p2, 0, "égalité exacte = GOTCHA et remise à zéro");
assert.equal(gotcha.statsByPlayer.p1.gotchas, 1);
assert.equal(gotcha.statsByPlayer.p1.victims, 1);
assert.equal(gotcha.statsByPlayer.p1.bestVisit, 60);
// Tour suivant p2 : dépassement -> bust, score inchangé.
gotcha.scores.p2 = 190;
gotcha = playGotchaVisit(gotcha, [{ bed: "D", number: 10 }]);
assert.equal(gotcha.scores.p2, 190);
assert.equal(gotcha.statsByPlayer.p2.busts, 1);
// Revenir à p1 et finir exactement.
gotcha.scores.p1 = 181;
gotcha.activePlayerIndex = 0;
gotcha = playGotchaVisit(gotcha, [{ bed: "S", number: 20 }]);
assert.equal(gotcha.phase, "finished");
assert.equal(gotcha.winnerId, "p1");
assert.equal(gotcha.statsByPlayer.p1.exactFinishes, 1);

// HARE & HOUNDS — progression sur l'ordre physique, stats et capture.
let hare = createHareState(players, {
  mode: "hare_hounds", selectedIds: ["p1", "p2"], players: 2, botLevel: "normal", seriesWins: 1,
  sfxEnabled: true, awenaEnabled: true, coachEnabled: true,
  rules: { houndStart: 5, targetZone: "any", roleMode: "first", direction: "clockwise", hareStart: 20 },
});
assert.equal(hare.harePlayerId, "p1");
assert.equal(hareCurrentSegment(hare, "p1"), 20);
hare = playHareVisit(hare, [{ bed: "S", number: 20 }, { bed: "S", number: 1 }, { bed: "MISS" }]);
assert.equal(hare.progressByPlayer.p1, 2);
assert.equal(hare.statsByPlayer.p1.validHits, 2);
assert.equal(hare.statsByPlayer.p1.bestVisitSteps, 2);
assert.equal(hare.statsByPlayer.p1.misses, 1);
// Positionner le limier juste avant le lièvre puis vérifier la capture.
hare.activePlayerIndex = 1;
hare.progressByPlayer.p2 = 15; // départ index 19 (5), +15 -> index 14 ; cible 8
hare.progressByPlayer.p1 = 15; // lièvre index 15 ; secteur 11
assert.equal(hareCurrentSegment(hare, "p2"), 8);
hare = playHareVisit(hare, [{ bed: "S", number: 8 }]);
assert.equal(hare.phase, "finished");
assert.equal(hare.winnerId, "p2");
assert.equal(hare.statsByPlayer.p2.catches, 1);

console.log("✅ CASTLE / GOTCHA / HARE & HOUNDS premium V4 engine tests OK");
