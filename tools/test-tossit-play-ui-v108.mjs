/** V108 TOSSIT PLAY layout / 18-mode engine regression (Node 22+).
 * Static UI checks supplement (do not replace) Android portrait/landscape testing.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TOSSIT_MODES, newTossitGame, applyTossitAction, undoTossitAction } from '../src/pages/tossit/tossitEngine.ts';
const screen = readFileSync('src/pages/tossit/TossitScreens.tsx','utf8');
const config = readFileSync('src/pages/tossit/TossitConfigV2.tsx','utf8');
const css = readFileSync('src/pages/tossit/tossitResponsive.css','utf8');
assert.equal(TOSSIT_MODES.length,18,'18 existing modes');
for (const token of ['AwenaConfigMedallion', 'phase="play"', 'tossit-play-ticker', 'tossit-play-brand', 'tossit-play-active', 'tossit-play-avatar', 'tossit-play-scoreboard', 'tossit-play-entry-heading', 'tossit-play-last-round'])
  assert.ok(screen.includes(token), `PLAY missing ${token}`);
for (const token of ['BackDot', 'InfoDot', 'TossitConfigV2', 'tossit-round-label', 'ScoreCards state={state}', 'TOSSIT_ROUND_MODES', 'aria-label={turnLabel}'])
  assert.ok(screen.includes(token), `Missing existing action or correct turn UI: ${token}`);
for (const token of ['export function AwenaConfigMedallion', 'inGame: phase === "play"', 'modeTopic: phase === "play" ? "rules" : "config"'])
  assert.ok(config.includes(token), `Shared Awena: ${token}`);
for (const token of ['tossit-play-score-card[data-active', 'tossit-play-score-card[data-winner', 'orientation: landscape', 'max-width: 599px', 'prefers-reduced-motion', 'tossit-play-active__stack'])
  assert.ok(css.includes(token), `PLAY CSS missing ${token}`);
const players = [{id:'p1', name:'Alice', avatarDataUrl:'data:image/png;base64,aA=='},{id:'p2', name:'Bob'}];
const target = newTossitGame('target',players,3,1700000000000);
const targetNext = applyTossitAction(target,{kind:'target',hits:[1,2,3]});
assert.equal(targetNext.nextPlayerIndex,1,'Sequential TOSSIT mode moves active turn');
assert.equal(targetNext.scores.p1,7,'Engine scoring remains unchanged');
assert.equal(undoTossitAction(targetNext).scores.p1,0,'Undo remains operational');
const classic = newTossitGame('classic',players,3,1700000000000);
const round = applyTossitAction(classic,{kind:'classic',playerId:'p1',closestDarts:1,kiss:0,jackiss:false,jackissExtra:0,jumpover:false,jackover:false});
assert.equal(round.nextPlayerIndex,0,'Shared round does not imply sequential active player');
assert.equal(round.scores.p1,1);
console.log('TOSSIT V108 PLAY UI: 18 modes, overlay Awena/BackDot, profiles, shared/sequential rounds, scoring/undo OK');
