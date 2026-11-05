/** V146 – Replay Android/desktop checkpoints, finished preview and safety gates. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { recoverTop10, recoverMorpion } from "../src/lib/recoverTop10Morpion";
import { newMorpionGrid } from "../src/lib/morpionEngine";

const players = [
  { id: "profile-one", name: "Alice", isBot: false },
  { id: "bot-hard", name: "Bot", isBot: true, botLevel: "hard" },
];
const topInProgress = {
  id: "game-top", matchId: "game-top", kind: "top_10", status: "in_progress",
  players, createdAt: 100, resume: { route: "top_10_play", livePayload: {
    config: { players }, visitScores: [[60, 75], [90]], roundIdx: 1, currentPlayerIndex: 1,
    visitHistory: [ { playerId: players[0].id }, { playerId: players[1].id }, { playerId: players[0].id } ],
  } },
};
const resumedTop = recoverTop10(topInProgress);
assert.ok(resumedTop, "checkpoint TOP10 after reopening");
assert.deepEqual(resumedTop?.scores, [[60, 75], [90]]);
assert.deepEqual([resumedTop?.round, resumedTop?.current], [1, 1]);
assert.equal(resumedTop?.finished, false);
assert.equal(recoverTop10({ ...topInProgress, status: "finished" }), null, "finished cannot be resumed");
assert.equal(recoverTop10({ ...topInProgress, summary: { finished: true } }), null, "stale finished cannot be resumed");
assert.equal(recoverTop10({ ...topInProgress, resume: { livePayload: { visitScores: [] } } }), null, "incomplete cannot be resumed");

const completedScores = [Array(10).fill(120), Array(10).fill(90)];
const topFinished = {
  ...topInProgress, status: "finished", finishedAt: 1000, winnerId: players[0].id,
  resume: topInProgress.resume, // deliberately STALE last-live checkpoint
  payload: { config: { players }, visitScores: completedScores, roundIdx: 10, currentPlayerIndex: 0,
    visitHistory: Array.from({ length: 20 }, (_, i) => ({ playerId: players[i % 2].id })) },
};
assert.equal(recoverTop10(topFinished), null, "a completed match is never writable");
const topPreview = recoverTop10(topFinished, { preview: true });
assert.equal(topPreview?.finished, true);
assert.equal(topPreview?.round, 10);
assert.equal(topPreview?.scores[0][9], 120);
assert.equal(topPreview?.visits.length, 20, "finished preview uses completed payload, not stale live resume");
assert.equal(recoverTop10({ ...topFinished, payload: { ...topFinished.payload, visitScores: [[60],[90]] } }, { preview: true }), null);

const start = newMorpionGrid(2, () => .432);
const withMarks = { ...start, marks: start.marks.map(row => [...row]) };
withMarks.marks[4][0] = 3;
const morpionCheckpoint = {
  id: "game-morpion", matchId: "game-morpion", kind: "tic_tac_toe", status: "in_progress", players,
  resume: { livePayload: { config: { players, rounds: 3 }, grid: withMarks, matchWins: [1, 0],
    roundIdx: 1, currentPlayerIndex: 1, roundResult: null, visitHistory: [{playerId: players[0].id}] } },
};
const resumedMorpion = recoverMorpion(morpionCheckpoint);
assert.equal(resumedMorpion?.grid.marks[4][0], 3);
assert.equal(resumedMorpion?.wins[0], 1);
assert.equal(resumedMorpion?.round, 1);
assert.equal(recoverMorpion({ ...morpionCheckpoint, status: "finished" }), null);

const winningGrid = { ...start, owners: [...start.owners], marks: start.marks.map(row => [...row]) };
for (const cell of [0,1,2]) { winningGrid.owners[cell] = 0; winningGrid.marks[cell][0] = 4; }
const morpionFinished = {
  ...morpionCheckpoint, status: "finished", finishedAt: 1000, winnerId: players[0].id,
  payload: { config: { players, rounds: 3 }, grid: winningGrid, matchWins: [2, 0],
    roundIdx: 1, currentPlayerIndex: 0, roundResult: { winner: 0, draw: false }, visitHistory: [{playerId: players[0].id}] },
};
assert.equal(recoverMorpion(morpionFinished), null);
const morpionPreview = recoverMorpion(morpionFinished, { preview: true });
assert.equal(morpionPreview?.finished, true);
assert.equal(morpionPreview?.winnerId, players[0].id);
assert.deepEqual(morpionPreview?.grid.owners.slice(0,3), [0,0,0]);
assert.deepEqual(morpionPreview?.wins, [2,0]);
assert.equal(recoverMorpion({ ...morpionFinished, winnerId: "unknown" }, { preview: true }), null);

for (const page of ["Top10Play", "TicTacToePlay"]) {
  const source = readFileSync(`src/pages/${page}.tsx`, "utf8");
  assert.match(source, /if \(!resuming\)\s*\{\s*persist\(/, `${page}: no initial write while resuming`);
  assert.match(source, /recover(?:Top10|Morpion)\(saved, \{ preview \}\)/, `${page}: preview flag reaches recovery`);
  assert.match(source, /setFinished\(restored\.finished\)/, `${page}: hydrate finished state`);
  assert.match(source, /if \(record\.status === "finished"\) props\?\.onFinish\?\.\(record\)|if \(r\.status === "finished"\) props\?\.onFinish\?\.\(r\)/, `${page}: finish callback after write`);
  assert.ok(source.indexOf(".then(() => History.upsert(") < source.indexOf('props?.onFinish?.('), `${page}: persist before finish callback`);
  assert.match(source, /setSaveStatus\("error"\)/, `${page}: surface storage errors`);
  assert.match(source, /hydration !== "ready" \|\| preview/, `${page}: preview cannot write`);
}
const historySource = readFileSync("src/pages/HistoryPage.tsx", "utf8");
assert.match(historySource, /const canPreview = inProg \|\| \["top10", "tictactoe"\]/, "completed modes expose read-only preview");
assert.match(historySource, /\{canPreview \? \(/, "preview icon available");
console.log("OK V146: 26+ restart, recovery, preview and persistence contracts");
