/** V204 wave 12 — touch-first final trio: preview/engine parity, no accidental submission. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { newTossitGame, applyTossitAction, undoTossitAction, TOSSIT_MODES } from '../src/pages/tossit/tossitEngine.ts';
import { previewReachTurn, previewRainbowTurn, previewBottleRound } from '../src/pages/tossit/tossitCreativePreview.ts';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const screens = readFileSync('src/pages/tossit/TossitScreens.tsx', 'utf8');
const css = readFileSync('src/pages/tossit/tossitResponsive.css', 'utf8');
const players = [{ id: 'alice', name: 'Alice' }, { id: 'bob', name: 'Bob' }];
assert.equal(TOSSIT_MODES.length, 18);
for (const mode of ['reach', 'rainbow', 'bottle']) {
  const mark = `{mode === "${mode}" && <section`;
  const start = screens.indexOf(mark, screens.indexOf('export function TossitPlay'));
  assert.ok(start > 0, `${mode} is present`);
  const next = screens.indexOf('{mode === ', start + mark.length);
  const section = screens.slice(start, next > 0 ? next : undefined);
  assert.match(section, /TossitCountChoices|TossitQuickChoices/, `${mode}: touch controls`);
  assert.match(section, /TossitEntrySummary/, `${mode}: preview`);
  assert.match(section, /disabled=\{!\w+Preview\.ready\}/, `${mode}: invalid entry blocked`);
  assert.ok(!section.includes('<select'), `${mode}: no select menus`);
}
assert.match(css, /\.tossit-measure-field/);
assert.match(css, /orientation: landscape/);
assert.match(screens, /writeDraft\(state\)/);
assert.match(screens, /undoTossitAction\(old\)/);
assert.match(screens, /lastCommitAt.current < 550/);
for (const path of ['src/pages/tossit/TossitScreens.tsx', 'src/pages/tossit/tossitCreativePreview.ts']) {
  const content = readFileSync(path, 'utf8');
  const result = ts.transpileModule(content, {
    fileName: path, reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  });
  assert.equal(result.diagnostics?.length || 0, 0, `${path}: syntax`);
}

assert.equal(previewReachTurn(0, '0', 3).ready, true);
assert.equal(previewReachTurn(1, '0', 3).ready, false);
assert.equal(previewReachTurn(1, '1.23', 3).ready, false);
assert.equal(previewReachTurn(1, '351', 3).ready, false);
assert.equal(previewReachTurn(4, '145', 3).ready, false);
assert.equal(previewReachTurn(2, '145,5', 3, { bestCm: 140, stuck: 3 }).recordCm, 145.5);
assert.equal(previewReachTurn(2, '145,5', 3, { bestCm: 140, stuck: 3 }).totalStuck, 5);
let reach = newTossitGame('reach', players, 3, 1000, 4, 3);
const reachPreview = previewReachTurn(2, '145,5', 3, reach.reach.alice);
reach = applyTossitAction(reach, { kind: 'reach', stuck: reachPreview.stuck, bestCm: reachPreview.cm }, 1001);
assert.equal(reach.scores.alice, reachPreview.recordCm);
assert.equal(reach.reach.alice.stuck, reachPreview.totalStuck);
assert.equal(undoTossitAction(reach).scores.alice, 0);

assert.equal(previewRainbowTurn('ring', 2, 0, true, 3).ready, false);
assert.equal(previewRainbowTurn('stack', 0, 1, true, 3).ready, false);
assert.equal(previewRainbowTurn('stack', 2, 3, false, 3).ready, false);
assert.equal(previewRainbowTurn('ring', 3, 0, true, 3).points, 6);
assert.equal(previewRainbowTurn('stack', 0, 3, true, 3).points, 6);
let rainbow = newTossitGame('rainbow', players, 3, 2000, 4, 3);
const rainbowPreview = previewRainbowTurn('ring', 3, 0, true, 3);
rainbow = applyTossitAction(rainbow, { kind: 'rainbow', pattern: 'ring', colors: 3, stackHeight: 0, completed: true }, 2001);
assert.equal(rainbow.scores.alice, rainbowPreview.points);
assert.equal(undoTossitAction(rainbow).scores.alice, 0);

const invalidBottle = previewBottleRound(players, { alice: 1, bob: 0 }, { alice: 2 }, 'alice', 3);
assert.equal(invalidBottle.ready, false);
const noClosest = previewBottleRound(players, { alice: 1, bob: 0 }, {}, '', 3);
assert.equal(noClosest.ready, false);
assert.equal(noClosest.needsClosest, true);
const allMiss = previewBottleRound(players, {}, {}, '', 3);
assert.equal(allMiss.ready, true);
let bottle = newTossitGame('bottle', players, 3, 3000, 4, 3);
const bottlePreview = previewBottleRound(players, { alice: 2, bob: 1 }, { alice: 1, bob: 0 }, 'bob', 3);
assert.equal(bottlePreview.ready, true);
assert.deepEqual(bottlePreview.points, { alice: 3, bob: 1 });
bottle = applyTossitAction(bottle, { kind: 'bottle', stuck: { alice: 2, bob: 1 }, onBottle: { alice: 1, bob: 0 }, closestPlayerId: bottlePreview.closestPlayerId }, 3001);
assert.deepEqual(bottle.scores, bottlePreview.points);
assert.equal(undoTossitAction(bottle).events.length, 0);
console.log('TOSSIT V204 Wave 12 OK — touch panels, previews equal engines, guards, undo, TS/TSX syntax.');
