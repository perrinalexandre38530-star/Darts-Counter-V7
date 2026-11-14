/**
 * V140 regression: SHOVE A PENNY's last validated visit remains undoable
 * after History V4 serialization and Android/Web reload, without recursive
 * or unbounded snapshots. No app boot or external services required.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/lib/gameEngines/wave61EightModeCheckpoint.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: 'wave61EightModeCheckpoint.ts', reportDiagnostics: true,
});
assert.equal((compiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
const module = { exports: {} };
const cloneWave61State = state => structuredClone(state);
vm.runInNewContext(compiled.outputText, {
  module, exports: module.exports,
  require: name => {
    assert.equal(name, './wave61Engine');
    return { cloneWave61State };
  },
});
const { withWave61EightModeUndoCheckpoint: checkpoint,
  getWave61EightModeUndoCheckpoint: getUndo,
  normalizeWave61EightModeRestoredState: normalize,
  getWave61PendingBotVisitRecap: getBotRecap } = module.exports;

const state = (modeId, visitCount) => ({
  sport: 'darts', mode: 'wave61', modeId,
  phase: 'playing', startedAt: 1763000000000,
  players: [{ id: 'ninja', name: 'Ninja' }, { id: 'awena', name: 'Awena' }],
  visits: Array.from({ length: visitCount }, (_, i) => ({ id: `v${i + 1}`, playerId: i%2 ? 'awena':'ninja', darts: [{ bed: 'S', number: 15 }] })),
  special: { shoveMarksByPlayer: { ninja: { 15: visitCount }, awena: {} } },
});

const initial = state('shove_a_penny', 0);
const once = checkpoint(state('shove_a_penny', 1), initial);
assert.ok(once.special.lastVisitUndo, 'first validated visit gets a durable undo point');
assert.equal(getUndo(once)?.visits.length, 0);
assert.ok(!once.special.lastVisitUndo.special.lastVisitUndo, 'no nested checkpoint');
const twice = checkpoint(state('shove_a_penny', 2), once);
assert.equal(twice.special.lastVisitUndo?.visits.length, 1);
assert.ok(!twice.special.lastVisitUndo.special.lastVisitUndo, 'nested checkpoint removed before serialization');
const restored = normalize(structuredClone(twice));
assert.equal(getUndo(restored)?.visits.length, 1, 'last visit undoable after reload');
assert.equal(restored.visits.length, 2, 'durable checkpoint does not alter current visit count');

const foreign = state('shove_a_penny', 2);
foreign.special.lastVisitUndo = { ...initial, startedAt: 13 };
assert.equal(getUndo(foreign), null, 'reject a checkpoint from a different match');
const stale = state('shove_a_penny', 2);
stale.special.lastVisitUndo = initial;
assert.equal(getUndo(stale), null, 'reject a stale visit count');
const unrelated = checkpoint(state('color_call', 1), state('color_call', 0));
assert.equal(getUndo(unrelated)?.visits.length, 0, 'existing mode retains undo');
assert.ok(!checkpoint(state('x01', 1), state('x01', 0)).special.lastVisitUndo, 'other engines unaffected');
assert.ok(!checkpoint({ ...state('shove_a_penny', 1), phase: 'finished' }, initial).special.lastVisitUndo,
  'finished match does not acquire a replayable live checkpoint');

const botRecap = state('shove_a_penny', 1);
botRecap.special.pendingBotVisitRecap = { isBot: true, visitId: 'v1' };
assert.equal(getBotRecap(botRecap)?.visitId, 'v1', 'genuine SHOVE BOT recap stays resumable');
const corrupt = state('shove_a_penny', 1);
corrupt.special.pendingBotVisitRecap = { isBot: true, visitId: 'another-match' };
assert.ok(!normalize(corrupt).special.pendingBotVisitRecap, 'orphaned recap cannot block SHOVE play');

const play = fs.readFileSync(new URL('../src/pages/Wave61SharedPlay.tsx', import.meta.url), 'utf8');
assert.match(play, /withWave61EightModeUndoCheckpoint\(committed, previous\)/,
  'actual commits use the checkpoint helper');
assert.match(play, /const persistedLastVisitUndo = getWave61EightModeUndoCheckpoint\(state\)/,
  'reloaded snapshots are offered to the UNDO button');
assert.match(play, /\.then\(\(\) => History\.remove\(matchId\)\)/,
  'undo of a first validated visit deletes the old canonical History row');
console.log('✅ SHOVE V140 : UNDO durable, reprise History V4, BOT recap, anti-corruption et snapshot borné.');
