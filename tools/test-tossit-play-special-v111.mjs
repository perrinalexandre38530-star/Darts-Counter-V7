/** TOSSIT V111 Wave 16 — UI contract + pure engine regression (no React runtime required).
 * Note: this cannot replace visual tests in Chrome/Android portrait and landscape.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TOSSIT_MODES, newTossitGame, applyTossitAction, undoTossitAction } from '../src/pages/tossit/tossitEngine.ts';

const players = [{id:'p1',name:'Ninja'},{id:'p2',name:'Jess'}];
const screen = readFileSync('src/pages/tossit/TossitScreens.tsx','utf8');
const css = readFileSync('src/pages/tossit/tossitResponsive.css','utf8');
assert.equal(TOSSIT_MODES.length,18,'All 18 modes remain present');
for (const marker of [
  'tossit-mode-panel--tictac', 'tossit-tictac-board', '--tossit-grid-size',
  'data-occupied={cell ?', 'state.board[tictacSelection] !== null',
  'tossit-mode-panel--river', 'tossit-river-lanes', 'tossit-river-preview',
  'riverStop >= 0', 'riverAttackPoints', 'TossitCountChoices value={riverKiss}',
  'tossit-mode-panel--football', 'tossit-football-duel', 'tossit-football-progress',
  'tossit-football-throw-track', 'displayedPitchOutcome',
  'AwenaConfigMedallion', 'tossit-play-avatar', 'tossit-play-scoreboard',
  'tossit-confirm-button', 'aria-live="polite"',
]) assert.ok(screen.includes(marker), `PLAY UI missing: ${marker}`);
for (const marker of [
  '.tossit-tictac-board', '.tossit-river-lanes', '.tossit-river-preview',
  '.tossit-football-duel', '.tossit-football-progress',
  '@media (max-width: 390px)', '@media (orientation: landscape) and (min-width: 600px)',
  '@media (prefers-reduced-motion: reduce)',
]) assert.ok(css.includes(marker), `Responsive CSS missing: ${marker}`);
// Occupied cells must consume a turn without awarding a second point.
let tic = newTossitGame('tictac',players,3,1700000000000,4);
const ticEmpty=tic;
tic=applyTossitAction(tic,{kind:'tictac',cell:0});
assert.equal(tic.board[0],'p1'); assert.equal(tic.scores.p1,1);
tic=applyTossitAction(tic,{kind:'tictac',cell:0});
assert.equal(tic.board[0],'p1'); assert.equal(tic.scores.p2,0); assert.equal(tic.nextPlayerIndex,0);
tic=undoTossitAction(tic);
assert.equal(tic.nextPlayerIndex,1);
tic=applyTossitAction(tic,{kind:'tictac',cell:1});
assert.equal(tic.board[1],'p2'); assert.equal(tic.scores.p2,1);
assert.equal(ticEmpty.board[0],null);
// River is authoritative on stopping the turn; own-side landing awards the opponent.
let river=newTossitGame('river',players,6,1700000000000);
const riverBefore=river;
river=applyTossitAction(river,{kind:'river', landings:[
  {kind:'opponent', points:3}, {kind:'own', points:2}, {kind:'river', points:0}], kiss:1, jumpover:false});
assert.equal(river.scores.p1,5); assert.equal(river.scores.p2,2);
assert.equal(river.nextPlayerIndex,1);
river=undoTossitAction(river);
assert.deepEqual(river.scores,riverBefore.scores);
// Football Pitch: confirmed start -> defender block -> goal; then rotate roles.
let football=newTossitGame('football_pitch',players,6,1700000000000);
football=applyTossitAction(football,{kind:'football_pitch',outcome:'centre'});
assert.equal(football.pitch.chainLength,1); assert.equal(football.nextPlayerIndex,1);
football=applyTossitAction(football,{kind:'football_pitch',outcome:'block'});
assert.equal(football.pitch.blocks,1); assert.equal(football.nextPlayerIndex,0);
football=applyTossitAction(football,{kind:'football_pitch',outcome:'goal'});
assert.equal(football.scores.p1,1);
assert.equal(football.pitch.drive,2);
assert.equal(football.pitch.attackerId,'p2');
assert.equal(football.nextPlayerIndex,1);
console.log('✅ TOSSIT V111 Wave 16 — UI contract and TicTac/River/Football engine regressions OK');
