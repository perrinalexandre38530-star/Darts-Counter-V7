// V184 — Regression guard for 5 VIES / CHASE completed-visit undo & local resume.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { captureFiveLivesUndo, isValidFiveLivesUndo } from '../src/lib/fiveLivesUndo.ts';
const read = path => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8');
const source = read('src/pages/FiveLivesPlay.tsx');
const responsive = read('src/pages/FiveLivesPlayResponsive.css');
const players = [
  { id: 'a', lives: 5, eliminated: false, stats: { visits: 0, livesLost: 0 } },
  { id: 'b', lives: 5, eliminated: false, stats: { visits: 0, livesLost: 0 } },
];
const before = { players, turnIndex: 0, chaseRoundQueue: ['a','b'], lastScoreToBeat: null, events: [] };
const previous = captureFiveLivesUndo(before);
assert.notEqual(previous.players, before.players, 'Checkpoint copies player array');
assert.notEqual(previous.chaseRoundQueue, before.chaseRoundQueue, 'Checkpoint copies chase order');
assert.notEqual(previous.events, before.events, 'Checkpoint copies visits');
// Reassign order and lose a life; undo must restore old checkpoint without mutating it.
const after = {
  players: [{...players[0], lives:4, stats:{visits:1,livesLost:1}}, players[1]],
  turnIndex:1, chaseRoundQueue:['b','a'], lastScoreToBeat:0,
  events:[{id:'visit-1',playerId:'a',score:0,lifeLost:true}],
};
assert.equal(isValidFiveLivesUndo(previous, after), true, 'Valid previous volley');
assert.equal(previous.players[0].lives, 5, 'Previous lives retained');
assert.equal(previous.lastScoreToBeat, null, 'Opening target restored');
assert.deepEqual(previous.chaseRoundQueue, ['a','b'], 'CHASE order restored');
const persisted = JSON.parse(JSON.stringify(previous));
assert.equal(isValidFiveLivesUndo(persisted, after), true, 'Undo still works after local JSON resume');
assert.equal(isValidFiveLivesUndo(previous, {...after,events:[...after.events,after.events[0]]}),false,'Cannot skip multiple visits');
assert.equal(isValidFiveLivesUndo({...previous,players:[players[1],players[0]]},after),false,'Wrong players refused');
assert.equal(isValidFiveLivesUndo({...previous,turnIndex: 3},after),false,'Out-of-range index refused');
assert.equal(isValidFiveLivesUndo({...previous,chaseRoundQueue:['ghost']},after),false,'Foreign queue entries refused');
assert.match(source, /setLastUndo\(captureFiveLivesUndo\(/,'Capture before scoring');
assert.match(source, /setPlayers\(lastUndo.players\)/,'Restore eliminated players and stats');
assert.match(source, /setChaseRoundQueue\(lastUndo.chaseRoundQueue\)/,'Restore shuffle state');
assert.match(source, /setLastScoreToBeat\(lastUndo.lastScoreToBeat\)/,'Restore target');
assert.match(source, /setEvents\(lastUndo.events\)/,'Restore visits');
assert.match(source, /lastUndo,\s*startedAt:/,'Persist previous visit with unfinished draft');
assert.match(source, /clearDartsMatchDraft\(modeDraftId, getStorageUser\(\)\);\s*return;\s*}\s*writeDartsMatchDraft/, 'Clear stale draft after undoing first visit');
assert.match(source, /disabled=\{!isValidFiveLivesUndo\(/,'Disable undo when invalid or before first visit');
assert.match(source, /\.\.\.\(isChase \? \{ variantId: "chase" \} : \{\}\),\s*status: "finished"/, 'History V4 payload tags CHASE');
assert.match(responsive, /msc-five-lives-undo-row/,'Undo is reachable beside keypad');
console.log('PASS V184 — undo restores lives, stats, target, CHASE order, resume and history tag.');
