import assert from "node:assert/strict";
import LZString from "lz-string";
import { hydrateLinkedHistoryRow } from "../src/lib/linkedProfileHistory.ts";

const originalPayload = {
  sport: "babyfoot",
  scoreA: 3,
  scoreB: 2,
  players: [
    { id: "linked-profile", name: "Ninja", score: 3 },
    { id: "opponent", name: "Chevroute", score: 2 },
  ],
  summary: {
    scoreA: 3,
    scoreB: 2,
    winnerId: "linked-profile",
    players: [
      { id: "linked-profile", name: "Ninja", score: 3 },
      { id: "opponent", name: "Chevroute", score: 2 },
    ],
  },
  stats: { shots: 18, shotsOnTarget: 11 },
  events: [{ type: "goal", playerId: "linked-profile", minute: 4 }],
};

const row = {
  id: "match-1",
  matchId: "match-1",
  kind: "babyfoot",
  players: [{ id: "linked-profile", name: "Ninja" }],
  summary: { scoreA: 0, scoreB: 0 },
  payloadCompressed: LZString.compressToUTF16(JSON.stringify(originalPayload)),
};

const hydrated = hydrateLinkedHistoryRow(row);
assert.equal(hydrated.summary.scoreA, 3);
assert.equal(hydrated.summary.scoreB, 2);
assert.equal(hydrated.players.length, 2);
assert.equal(hydrated.players[1].name, "Chevroute");
assert.equal(hydrated.payload.stats.shots, 18);
assert.equal(hydrated.payload.events.length, 1);
assert.equal(hydrated.payloadCompressed, undefined);

console.log("linked profile history hydration: OK");
