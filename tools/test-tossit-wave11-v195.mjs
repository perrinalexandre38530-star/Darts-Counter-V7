/** Regression checks for V195 Wave 11 touch-first Border / Thief & Cop / Chores. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { newTossitGame, applyTossitAction, undoTossitAction, TOSSIT_MODES } from '../src/pages/tossit/tossitEngine.ts';
import { previewBorderRound, previewThiefRound, previewChoreRound } from '../src/pages/tossit/tossitScoringPreview.ts';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const screen = readFileSync('src/pages/tossit/TossitScreens.tsx','utf8');
const css = readFileSync('src/pages/tossit/tossitResponsive.css','utf8');
const players=[{ id:'alice',name:'Alice' },{ id:'bob',name:'Bob' }];
assert.equal(TOSSIT_MODES.length,18);
for(const mode of ['border','thief_cop','chores']) {
  const token=`{mode === "${mode}" && <section`;
  const start=screen.indexOf(token, screen.indexOf("export function TossitPlay"));
  assert.ok(start >= 0, `${mode}: present`);
  const end=screen.indexOf('{mode === ',start+token.length);
  const code=screen.slice(start,end < 0 ? undefined : end);
  assert.match(code, /TossitQuickChoices/);
  assert.match(code, /<TossitEntrySummary>/);
  assert.match(code, /tossit-confirm-button/);
  assert.ok(!code.includes('<select'), `${mode} has no select menus`);
}
assert.match(css,/\.tossit-border-distance/);
assert.match(css,/orientation: landscape/);
assert.match(css,/max-width: 390px/);
assert.match(screen,/writeDraft\(state\)/);
assert.match(screen,/onFinish\?\.\(match\)/);
assert.match(screen,/lastCommitAt.current < 550/);
for(const [name,content] of [
  ['TossitScreens.tsx',screen],
  ['tossitScoringPreview.ts',readFileSync('src/pages/tossit/tossitScoringPreview.ts','utf8')],
]) {
  const parsed=ts.transpileModule(content,{fileName:name,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}});
  assert.equal(parsed.diagnostics?.length||0,0,`${name}: syntax`);
}
const B=(kind,cm='')=>({kind,cm});
const input={
 alice:[B('valid','1,5'), B('valid','2'), B('wrong')],
 bob:[B('valid','3'), B('miss'), B('wrong')],
};
const preview=previewBorderRound(players,input,3);
assert.equal(preview.ready,true);
assert.deepEqual(preview.valid.alice,[1.5,2]);
assert.deepEqual(preview.gain,{alice:3,bob:1});
let border=newTossitGame('border',players,3,1000);
border=applyTossitAction(border,{kind:'border',valid:preview.valid,wrongSide:preview.wrongSide},1100);
assert.deepEqual(border.scores,{alice:3,bob:1});
assert.equal(undoTossitAction(border).events.length,0);
assert.equal(previewBorderRound(players,{...input,alice:[B('valid',''), B('miss'), B('miss')]},3).ready,false);
const equal=previewBorderRound(players,{alice:[B('valid','2'),B('miss'),B('miss')],bob:[B('valid','2'),B('miss'),B('miss')]},3);
assert.deepEqual(equal.gain,{alice:0,bob:0});
const arrest=previewThiefRound(['close','direct','takedown','double_lock','miss','miss']);
assert.equal(arrest.points,3);
assert.deepEqual(arrest.selected,['close','direct','takedown']);
assert.equal(arrest.takedown,true);
let thief=newTossitGame('thief_cop',players,6,2000,4,2);
thief=applyTossitAction(thief,{kind:'thief_cop',captures:arrest.selected},2100);
assert.equal(thief.scores.bob,3);
assert.equal(thief.thiefCopWins.bob,1);
assert.equal(undoTossitAction(thief).scores.bob,0);
let chores=newTossitGame('chores',players,3,3000,4,3);
const throws=[{effect:'chore',recipientId:'bob',chore:'laundry'}, {effect:'jumpover',recipientId:'bob',chore:'dishes'}, {effect:'kiss',recipientId:'bob',chore:'dishes'}];
const chorePreview=previewChoreRound(players,chores.chores,throws,["laundry","dishes"]);
assert.equal(chorePreview.ready,true);
assert.deepEqual(chorePreview.pending.bob,['laundry','dishes']);
chores=applyTossitAction(chores,{kind:'chores',throws},3100);
assert.deepEqual(chores.chores,chorePreview.pending);
assert.equal(undoTossitAction(chores).chores.bob.length,0);
const clearPreview=previewChoreRound(players,{alice:[],bob:['dishes']},[{effect:'free_day',recipientId:'bob'},{effect:'miss'},{effect:'miss'}],["dishes"]);
assert.equal(clearPreview.counts.bob,0);
console.log('V195 Wave 11 OK — 18 modes, three mobile entry panels, previews equal engine outcomes, undo, TSX parse.');
