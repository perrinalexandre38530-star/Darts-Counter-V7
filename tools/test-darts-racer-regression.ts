import assert from "node:assert/strict";
import {
  cloneDartsRacerState,
  createDartsRacerState,
  dartsRacerDartPoints,
  playDartsRacerVisit,
} from "../src/lib/gameEngines/dartsRacerEngine.ts";

const players = [{ id: "p1", name: "Ninja" }, { id: "p2", name: "Rival" }];
let state = createDartsRacerState(players, {
  participantMode: "players",
  trackLength: 30,
  laps: 1,
  raceStyle: "sprint",
  specialCells: false,
  collisions: false,
  maxRounds: 20,
});

state = playDartsRacerVisit(state, [
  { bed: "T", number: 20 },
  { bed: "D", number: 20 },
  { bed: "IB" },
]);
assert.equal(state.statsByPlayer.p1.darts, 3);
assert.equal(state.statsByPlayer.p1.hits, 3);
assert.equal(state.statsByPlayer.p1.netDistance, 10);
assert.equal(state.statsByPlayer.p1.dartPoints, 150);
assert.equal(state.statsByPlayer.p1.bestVisitPoints, 150);
assert.equal(state.statsByPlayer.p1.productiveVisits, 1);
assert.equal(state.statsByPlayer.p1.perfectVisits, 1);
assert.deepEqual(state.statsByPlayer.p1.visitDistances, [10]);
assert.deepEqual(state.statsByPlayer.p1.visitScores, [150]);
assert.equal(state.statsByPlayer.p1.hitsBySegment.T20, 1);
assert.equal(state.statsByPlayer.p1.hitsBySegment.D20, 1);
assert.equal(state.statsByPlayer.p1.hitsBySegment.DBULL, 1);
assert.equal(dartsRacerDartPoints({ bed: "OB" }), 25);

const cloned = cloneDartsRacerState(state);
cloned.statsByPlayer.p1.visitDistances.push(999);
cloned.statsByPlayer.p1.hitsBySegment.T20 = 99;
assert.deepEqual(state.statsByPlayer.p1.visitDistances, [10], "clone must deep-copy visit arrays");
assert.equal(state.statsByPlayer.p1.hitsBySegment.T20, 1, "clone must deep-copy segment map");

// Rival plays a blank visit.
state = playDartsRacerVisit(state, [{ bed: "MISS" }, { bed: "MISS" }, { bed: "MISS" }]);
assert.equal(state.statsByPlayer.p2.emptyVisits, 1);
assert.equal(state.statsByPlayer.p2.misses, 3);

// Finish p1. The finishing visit must only count darts actually used before crossing the line.
while (!state.finished) {
  const active = state.turnOrder[state.activePlayerIndex];
  state = playDartsRacerVisit(state, active === "p1"
    ? [{ bed: "IB" }, { bed: "IB" }, { bed: "IB" }]
    : [{ bed: "MISS" }, { bed: "MISS" }, { bed: "MISS" }]);
}
assert.equal(state.finishReason, "finish_line");
assert.equal(state.winnerIds[0], "p1");
const p1HistoryDarts = state.history.filter(v => v.playerId === "p1").reduce((a,v)=>a+v.darts.length,0);
assert.equal(state.statsByPlayer.p1.darts, p1HistoryDarts, "player dart count must match persisted telemetry");
assert.ok(state.statsByPlayer.p1.finishVisit);
assert.ok(state.entities.p1.finishDarts);

console.log("✅ DARTS RACER regression OK");
