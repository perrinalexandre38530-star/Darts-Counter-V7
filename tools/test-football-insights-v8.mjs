import assert from "node:assert/strict";
import {
  buildFootballMomentumFromState,
  footballMatchHonoursFromState,
  buildFootballCareerHonours,
} from "../src/lib/footballInsights.ts";

const state = {
  config: { variant: "match" },
  sides: [
    { id: "a", name: "A", playerIds: ["p1"] },
    { id: "b", name: "B", playerIds: ["p2"] },
  ],
  players: [{ id: "p1", name: "Alpha" }, { id: "p2", name: "Beta" }],
  scoreBySide: { a: 3, b: 1 },
  winnerSideIds: ["a"],
  winnerPlayerIds: ["p1"],
  stage: "regulation",
  statsByPlayer: {
    p1: { darts: 12, successfulActions: 10, goals: 3, shots: 4, shotsOnTarget: 4, saves: 0, interceptions: 1, advances: 9, counterAttacks: 2, penaltiesScored: 0 },
    p2: { darts: 12, successfulActions: 5, goals: 1, shots: 2, shotsOnTarget: 1, saves: 3, interceptions: 3, advances: 2, counterAttacks: 0, penaltiesScored: 0 },
  },
  visits: [
    { sideId: "b", scoreBefore: { a: 0, b: 0 }, scoreAfter: { a: 0, b: 1 }, events: [{ type: "goal", label: "BUT" }] },
    { sideId: "a", scoreBefore: { a: 0, b: 1 }, scoreAfter: { a: 1, b: 1 }, events: [{ type: "goal", label: "BUT" }] },
    { sideId: "a", scoreBefore: { a: 1, b: 1 }, scoreAfter: { a: 2, b: 1 }, events: [{ type: "interception", label: "interception + contre" }, { type: "goal", label: "BUT" }] },
    { sideId: "a", scoreBefore: { a: 2, b: 1 }, scoreAfter: { a: 3, b: 1 }, events: [{ type: "goal", label: "BUT" }] },
  ],
};

const momentum = buildFootballMomentumFromState(state, 4);
assert.ok(momentum.leftPct > momentum.rightPct, "le camp A doit dominer la dynamique");
assert.equal(momentum.leaderSideId, "a");

const honours = footballMatchHonoursFromState(state);
assert.ok(honours.some((x) => x.label === "HAT-TRICK"), "hat-trick absent");
assert.ok(honours.some((x) => x.label === "REMONTÉE"), "remontée absente");
assert.ok(honours.some((x) => x.label === "MUR"), "distinction gardien absente");
assert.ok(honours.some((x) => x.label === "SENTINELLE"), "distinction défense absente");

const record = {
  kind: "football",
  finishedAt: 2000,
  winnerIds: ["p1"],
  summary: {
    mode: "football",
    variant: "golden_goal",
    winnerIds: ["p1"],
    draw: false,
    scoreBySide: { a: 3, b: 0 },
    perPlayer: [
      { id: "p1", name: "Alpha", sideId: "a", goals: 3, saves: 0, interceptions: 1, darts: 12, successfulActions: 10, win: true },
      { id: "p2", name: "Beta", sideId: "b", goals: 0, saves: 3, interceptions: 3, darts: 12, successfulActions: 5, win: false },
    ],
  },
  payload: { stateSnapshot: { ...state, scoreBySide: { a: 3, b: 0 }, config: { variant: "golden_goal" }, visits: state.visits } },
  resume: { state: { ...state, scoreBySide: { a: 3, b: 0 }, config: { variant: "golden_goal" }, visits: state.visits } },
};
const career = buildFootballCareerHonours([record], "p1", "Alpha");
assert.equal(career.hatTricks, 1);
assert.equal(career.cleanSheets, 1);
assert.equal(career.goldenGoalWins, 1);
assert.ok(career.bestRating > 0);

console.log("DARTS FOOTBALL insights V8: OK");
