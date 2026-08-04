import assert from "node:assert/strict";
import { decodeCompactMatch, encodeCompactMatch } from "../src/lib/matchCompactCodec.ts";

const stateSnapshot = {
  phase: "playing",
  ballPosition: 5,
  possessionSideIndex: 0,
  scoreBySide: { blue: 2, red: 1 },
  sides: [
    { id: "blue", name: "Bleus", playerIds: ["p1"] },
    { id: "red", name: "Rouges", playerIds: ["p2"] },
  ],
  visits: [{ id: "v1", playerId: "p1", darts: [{ bed: "T", number: 20 }] }],
};
const record = {
  id: "football-test",
  kind: "football",
  mode: "football",
  sport: "darts",
  status: "in_progress",
  players: [
    { id: "p1", name: "Ninja", darts: 12, visits: 4, successfulActions: 7, goals: 2, shots: 3, shotsOnTarget: 2, saves: 0, interceptions: 1, advances: 8, singles: 3, doubles: 2, triples: 1, misses: 2 },
    { id: "p2", name: "Hubert", darts: 9, visits: 3, successfulActions: 4, goals: 1, shots: 2, shotsOnTarget: 1, saves: 2, interceptions: 2, advances: 4, singles: 2, doubles: 1, triples: 0, misses: 3 },
  ],
  summary: { winnerId: null, scoreLine: "Bleus 2 - 1 Rouges", variant: "match" },
  payload: {
    kind: "football",
    mode: "football",
    config: { variant: "match", halfRounds: 5 },
    stateSnapshot,
    visits: stateSnapshot.visits,
    stats: { mode: "football", players: [], match: { goals: 3, shotsOnTarget: 3 } },
    summary: { scoreLine: "Bleus 2 - 1 Rouges", variant: "match", matchStats: { goals: 3, shotsOnTarget: 3 } },
  },
};

const compact = encodeCompactMatch(record);
assert.ok(compact);
assert.equal(compact!.m, "football_darts");
assert.equal(compact!.d?.fb?.stateSnapshot?.ballPosition, 5);
const decoded = decodeCompactMatch(compact);
assert.ok(decoded);
assert.equal(decoded!.mode, "football_darts");
assert.equal(decoded!.stateSnapshot?.ballPosition, 5);
assert.equal(decoded!.visits?.length, 1);
const p1 = decoded!.players.find((player: any) => player.id === "p1") as any;
assert.equal(p1.goals, 2);
assert.equal(p1.successfulActions, 7);
assert.equal(p1.interceptions, 1);
assert.equal(p1.advances, 8);
assert.equal((decoded as any).stats?.match?.goals, 3);
console.log("DARTS FOOTBALL compact codec: OK");
