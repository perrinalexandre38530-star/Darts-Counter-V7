/** TOSSIT V192 Wave 10 — touch-first scoring and unchanged engine contracts. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { TOSSIT_MODES, newTossitGame, applyTossitAction, undoTossitAction } from '../src/pages/tossit/tossitEngine.ts';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const screen = readFileSync('src/pages/tossit/TossitScreens.tsx', 'utf8');
const styles = readFileSync('src/pages/tossit/tossitResponsive.css', 'utf8');
assert.equal(TOSSIT_MODES.length, 18, 'All 18 TOSSIT modes must be preserved');
assert.ok(screen.includes('function TossitCountChoices('), 'Count keys are shared across scoring modes');
assert.ok(screen.includes('function TossitEntrySummary('), 'Provisional summary component exists');
for (const mode of ['speed','duel','battle','sniper','conquest']) {
  const marker = `{mode === "${mode}" && <section`;
  assert.ok(screen.includes(marker), `${mode} page must remain available`);
  const from = screen.indexOf(marker);
  const to = screen.indexOf('{mode === ', from + marker.length);
  const fragment = screen.slice(from, to < 0 ? undefined : to);
  assert.ok(fragment.includes('TossitQuickChoices') || fragment.includes('TossitCountChoices'), `${mode} uses touch keys`);
  assert.ok(fragment.includes('<TossitEntrySummary>'), `${mode} has a provisional summary`);
  assert.ok(fragment.includes('tossit-confirm-button'), `${mode} retains explicit confirmation`);
  assert.ok(!fragment.includes('<select'), `${mode} should not force native dropdown menus`);
}
for (const marker of ['disabled={((battleStuck', 'disabled={sniperOutcome !== "miss" && !sniperWinner}', 'disabled={players.every(p => (conquestStuck',
  'setBattleTieWinner("")', 'setConquestFirst("")', 'onChange={setDuelJack}', 'lastCommitAt.current < 550',
  'tossit-play-grid', 'writeDraft(state)', 'onFinish?.(match)', 'tossit-undo-button']) {
  assert.ok(screen.includes(marker) || marker === 'onChange={setDuelJack}' && screen.includes('setDuelJack(e.target.checked)'), `Missing safety/navigation contract: ${marker}`);
}
for (const marker of ['.tossit-score-entry-card', '.tossit-check-option', '.tossit-entry-summary', '@media (max-width: 390px)', '@media (orientation: landscape)']) {
  assert.ok(styles.includes(marker), `Missing touch layout style ${marker}`);
}
const output = ts.transpileModule(screen, { fileName: 'TossitScreens.tsx', reportDiagnostics: true,
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } });
assert.equal(output.diagnostics?.length ?? 0, 0, 'TOSSIT TSX must parse');
const players = [{id:'alice',name:'Alice'}, {id:'bob',name:'Bob'}];
let speed = newTossitGame('speed',players,3,1000);
speed = applyTossitAction(speed,{kind:'speed',stuck:{alice:2,bob:0},kiss:{alice:1,bob:0}},1100);
assert.equal(speed.scores.alice,3); assert.equal(speed.scores.bob,-3);
assert.equal(undoTossitAction(speed).events.length,0);
let duel = newTossitGame('duel',players,6,1000);
duel = applyTossitAction(duel,{kind:'duel',stuck:3,jackStuck:false,kiss:1,jumpover:2},1100);
assert.equal(duel.scores.alice,0);
duel = applyTossitAction(duel,{kind:'duel',stuck:2,jackStuck:true,kiss:1,jumpover:1},1200);
assert.equal(duel.scores.bob,6);
let battle = newTossitGame('battle',players,3,1000);
assert.throws(()=>applyTossitAction(battle,{kind:'battle',stuck:{alice:2,bob:2},jackStuck:true,closestPlayerId:'alice'}),/rock-paper|winner/i);
battle = applyTossitAction(battle,{kind:'battle',stuck:{alice:2,bob:2},tieWinnerId:'alice',jackStuck:true,closestPlayerId:'bob'},1100);
assert.equal(battle.scores.bob,1);
let conquest = newTossitGame('conquest',players,3,1000);
assert.throws(()=>applyTossitAction(conquest,{kind:'conquest',color:'Rouge',required:2,stuck:{alice:2,bob:2}}),/first/i);
conquest = applyTossitAction(conquest,{kind:'conquest',color:'Rouge',required:2,stuck:{alice:2,bob:2},firstId:'bob'},1100);
assert.equal(conquest.scores.bob,1);
let sniper = newTossitGame('sniper',players,3,1000);
assert.throws(()=>applyTossitAction(sniper,{kind:'sniper',outcome:'mega'}),/winner/i);
sniper = applyTossitAction(sniper,{kind:'sniper',outcome:'mega',playerId:'alice'},1100);
assert.equal(sniper.winnerId,'alice');assert.equal(sniper.finished,true);
console.log('TOSSIT Wave 10 / V192: 18 modes, 5 touch-entry modes, safe confirmations, TSX parse, scoring and undo OK');
