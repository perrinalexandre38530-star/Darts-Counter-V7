import assert from "node:assert/strict";
import {
  createShooterState,
  getShooterCurrentTarget,
  playShooterVisit,
} from "../src/lib/gameEngines/shooterEngine.ts";

const P = [{ id: "p1", name: "Alice" }, { id: "p2", name: "Bob" }];

// 1) Classic progression: T20 is worth 3 marks and clears a 3-mark target.
let state = createShooterState(P, { participantMode: "players", sequencePreset: "classic", includeBull: false, marksToClear: 3, maxRounds: 15, penaltyRule: "none", hitZone: "any", randomTargetCount: 10 });
assert.equal(getShooterCurrentTarget(state), 20);
state = playShooterVisit(state, [{ bed: "T", number: 20 }, { bed: "MISS" }, { bed: "MISS" }]);
assert.equal(state.entities.p1.targetIndex, 1);
assert.equal(state.entities.p1.score, 60);
assert.equal(state.statsByPlayer.p1.validDarts, 1);
assert.equal(state.statsByPlayer.p1.marks, 3);

// 2) Score penalty: a 0/3 visit removes the current target value from score.
let penalty = createShooterState(P, { participantMode: "players", sequencePreset: "classic", includeBull: false, marksToClear: 1, maxRounds: 15, penaltyRule: "score", hitZone: "any", randomTargetCount: 10 });
penalty = playShooterVisit(penalty, [{ bed: "S", number: 20 }, { bed: "MISS" }, { bed: "MISS" }]);
// Bob now plays and misses. Alice is then back and progresses to 19, score 20.
penalty = playShooterVisit(penalty, [{ bed: "MISS" }, { bed: "MISS" }, { bed: "MISS" }]);
penalty = playShooterVisit(penalty, [{ bed: "MISS" }, { bed: "MISS" }, { bed: "MISS" }]);
assert.equal(penalty.entities.p1.score, 1, "0/3 on target 19 should subtract 19 points from Alice's 20");
assert.equal(penalty.statsByPlayer.p1.penaltyEvents, 1);

// 3) Team progression is shared between teammates.
const teams = [{ id: "t1", name: "Team 1", playerIds: ["p1", "p2"] }];
let teamState = createShooterState(P, { participantMode: "teams", sequencePreset: "classic", includeBull: false, marksToClear: 3, maxRounds: 15, penaltyRule: "none", hitZone: "any", randomTargetCount: 10 }, teams);
teamState = playShooterVisit(teamState, [{ bed: "D", number: 20 }, { bed: "MISS" }, { bed: "MISS" }]);
assert.equal(teamState.entities.t1.marksOnTarget, 2);
teamState = playShooterVisit(teamState, [{ bed: "S", number: 20 }, { bed: "MISS" }, { bed: "MISS" }]);
assert.equal(teamState.entities.t1.targetIndex, 1);
assert.equal(teamState.entities.t1.score, 60);

// 4) A one-target random match finishes when the target is cleared.
let finish = createShooterState([{ id: "solo", name: "Solo" }], { participantMode: "players", sequencePreset: "random", randomTargetCount: 3, includeBull: false, marksToClear: 1, maxRounds: 15, penaltyRule: "none", hitZone: "any" });
// Force a deterministic one-target regression state while keeping engine invariants.
finish.sequence = [20];
finish = playShooterVisit(finish, [{ bed: "S", number: 20 }, { bed: "MISS" }, { bed: "MISS" }]);
assert.equal(finish.finished, true);
assert.equal(finish.finishReason, "completed");
assert.deepEqual(finish.winnerIds, ["solo"]);

console.log("SHOOTER regression tests: OK");
