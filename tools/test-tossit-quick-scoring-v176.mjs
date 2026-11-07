/** V176 wave 9: quick-touch scoring controls and existing scoring contracts. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TOSSIT_MODES, newTossitGame, applyTossitAction } from '../src/pages/tossit/tossitEngine.ts';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript'); // installed project devDependency

const screen = readFileSync('src/pages/tossit/TossitScreens.tsx', 'utf8');
const css = readFileSync('src/pages/tossit/tossitResponsive.css', 'utf8');
assert.equal(TOSSIT_MODES.length, 18, 'the 18 established TOSSIT modes remain available');
for (const phrase of [
  'function TossitQuickChoices<', 'type="button" className="tossit-quick-choice"',
  'aria-pressed={value === option.value}', 'className="tossit-classic-bonus-grid"',
  'label={tr("Joueur le plus proche", "Closest player")}',
  'label={`${p.name} — ${tr("ventouse", "dart")} ${i + 1}`}',
  'label={`${tr("Résultat", "Result")} ${i + 1}`}',
  'label={`${tr("Ventouse", "Dart")} ${i + 1}`}',
  'pitchOptions.some(option => option.value === pitchOutcome) ? pitchOutcome : "miss"',
  'onClick={() => { if (commit({ kind: "classic"',
  'onClick={() => { if (commit({ kind: "cornhole"',
  'onClick={() => { const cutAt = riverLandings.findIndex',
  'onClick={() => { if (commit({ kind: "goalkeeper"',
  'if (commit({ kind: "football_pitch", outcome:',
  'className="tossit-confirm-button"', 'lastCommitAt.current < 550',
  'disabled={!state.previous}',
]) assert.ok(screen.includes(phrase), `quick-scoring interface missing: ${phrase}`);
for (const phrase of ['.tossit-quick-choices', '.tossit-quick-choice[aria-pressed="true"]', 'min-height: 49px', '@media (max-width: 390px)', '.tossit-throw-row']) {
  assert.ok(css.includes(phrase), `mobile style missing: ${phrase}`);
}
const syntax = ts.transpileModule(screen, {fileName:'TossitScreens.tsx', reportDiagnostics: true, compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}});
assert.equal(syntax.diagnostics?.length ?? 0, 0, 'edited TSX syntax must parse');
const two = [{id:'a',name:'Alice'},{id:'b',name:'Bob'}];
let classic = newTossitGame('classic',two,3,1000);
classic = applyTossitAction(classic, {kind:'classic',playerId:'a',closestDarts:2,kiss:1,frenchKiss:0,jackiss:false,jackissExtra:0,jumpover:false,jackover:false});
assert.equal(classic.scores.a,4);
let river = newTossitGame('river',two,6,2000);
river = applyTossitAction(river, {kind:'river',landings:[{kind:'opponent',points:3},{kind:'own',points:2},{kind:'river',points:0}],kiss:0,jumpover:false});
assert.equal(river.scores.a,3);
assert.equal(river.scores.b,2);
let cornhole = newTossitGame('cornhole',two,3,3000);
cornhole = applyTossitAction(cornhole,{kind:'cornhole',throws:{a:['hole','hole','hole'],b:['board','miss','miss']},kiss:{a:0,b:0},jumpover:{a:0,b:0}});
assert.equal(cornhole.scores.a,17); // 18 - 1 cancellation
let goalkeeper = newTossitGame('goalkeeper',two,3,4000);
goalkeeper = applyTossitAction(goalkeeper, {kind:'goalkeeper',zones:[3,0,-1]});
assert.equal(goalkeeper.scores.a,2);
let football = newTossitGame('football_pitch',two,6,5000);
football = applyTossitAction(football, {kind:'football_pitch',outcome:'centre'});
football = applyTossitAction(football, {kind:'football_pitch',outcome:'miss'});
football = applyTossitAction(football, {kind:'football_pitch',outcome:'goal'});
assert.equal(football.scores.a,1);
assert.throws(() => applyTossitAction(newTossitGame('football_pitch',two,6), {kind:'football_pitch',outcome:'goal'}), /centre first/);
console.log('TOSSIT V176 wave 9: UI, 18 modes, TSX parse, five scoring contracts and role safety OK');
