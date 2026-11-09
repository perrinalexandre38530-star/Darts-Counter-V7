/** V108 rebase: the History V4 acknowledgement and crash-safe pending-result envelope. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { applyTossitAction, newTossitGame, summaryForTossit, TOSSIT_MODES } from '../src/pages/tossit/tossitEngine.ts';
import { encodeTossitPendingResult, decodeTossitPendingResult, tossitMatchId } from '../src/pages/tossit/tossitFinalRecovery.ts';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const players = [{ id: 'one', name: 'Alice' }, { id: 'two', name: 'Bob' }];
const supported = mode => TOSSIT_MODES.some(m => m.id === mode);
assert.equal(TOSSIT_MODES.length, 18, 'no modes lost during rebase');
const state = applyTossitAction(newTossitGame('sniper', players, 3, 1700000000000), {
  kind: 'sniper', outcome: 'mega', playerId: 'one',
}, 1700000001234);
assert.equal(state.finished, true);
const at = 1700000001235;
const match = {
  id: tossitMatchId(state), kind: 'tossit', sport: 'tossit', status: 'finished', mode: state.mode,
  winnerId: state.winnerId, players: state.players, createdAt: state.createdAt,
  updatedAt: at, finishedAt: at, summary: summaryForTossit(state),
  payload: { sport: 'tossit', mode: state.mode, dartsPerPlayer: state.dartsPerPlayer,
    players: state.players, events: state.events, scores: state.scores, winnerId: state.winnerId },
};
const packed = encodeTossitPendingResult(state, match);
assert.equal(typeof packed, 'string', 'finished game is retained while History writes');
const recovered = decodeTossitPendingResult(packed, supported);
assert.ok(recovered, 'valid pending result can survive reload');
assert.equal(recovered.match.id, match.id, 'stable match ID reused for retry');
assert.deepEqual(recovered.match.payload.events, match.payload.events, 'all completed turns preserved');
assert.equal(recovered.state.previous, null, 'no recursive snapshot in recovery storage');
assert.equal(tossitMatchId({ ...state, finishedAt: at + 999 }), match.id, 'retry does not create another ID');
assert.equal(encodeTossitPendingResult(newTossitGame('sniper', players), match), null, 'unfinished game cannot be queued');
const tamper = change => JSON.stringify({ ...JSON.parse(packed), ...change });
for (const [label, mutation] of Object.entries({
  'foreign mode': { state: { ...state, mode: 'unknown' } },
  'finished status false': { state: { ...state, finished: false } },
  'unrelated match': { match: { ...match, id: 'tossit-other' } },
  'missing events': { match: { ...match, payload: { ...match.payload, events: [] } } },
  'wrong player score': { match: { ...match, payload: { ...match.payload, scores: { ...state.scores, one: 999 } } } },
  'other sport': { match: { ...match, sport: 'darts' } },
})) assert.equal(decodeTossitPendingResult(tamper(mutation), supported), null, `reject ${label}`);
assert.equal(decodeTossitPendingResult('bad JSON', supported), null);
assert.equal(decodeTossitPendingResult('x'.repeat(2_000_001), supported), null, 'oversize recovery must be rejected');

const app = readFileSync('src/App.tsx', 'utf8');
const screens = readFileSync('src/pages/tossit/TossitScreens.tsx', 'utf8');
const css = readFileSync('src/pages/tossit/tossitResponsive.css', 'utf8');
assert.match(app, /return upsertPromise;/, 'History V4 promise returned to TOSSIT');
assert.match(app, /const confirmBeforeMirror = isTossitMatch \|\| options\?\.confirmPersistence === true;/, 'TOSSIT and V217 modes await History V4');
assert.match(app, /if \(!confirmBeforeMirror\) updateVisibleHistory\(\);/, 'other sports retain existing optimistic behavior');
assert.match(app, /if \(confirmBeforeMirror\) \{\s*void upsertPromise\.then\(\(committed\) => \{ if \(committed\) updateVisibleHistory\(\); \}\);/, 'TOSSIT history mirrors only after IndexedDB success');

assert.match(app, /<TossitPlay go=\{go\} params=\{routeParams\} onFinish=/, 'TOSSIT receives persistence callback');
for (const phrase of [
  'TOSSIT_PENDING_KEY', 'writePendingResult(state, match)', 'readPendingResult()',
  'clearPendingResultForMatch(match.id)', 'recoverPending: true',
  'if (!state.finished) writeDraft(state)', 'result !== true',
  'historyStatus === "failed"', 'disabled={historyStatus !== "saved"}',
  'tossitMatchId(state)', 'saveInFlight.current', 'params?.recoverPending && !recoveredResult',
]) assert.ok(screens.includes(phrase), `missing final-save contract ${phrase}`);
assert.match(css, /tossit-recovery-warning/);
for (const path of [
  'src/App.tsx', 'src/pages/tossit/TossitScreens.tsx',
  'src/pages/tossit/tossitFinalRecovery.ts',
]) {
  const source = readFileSync(path, 'utf8');
  const output = ts.transpileModule(source, {
    fileName: path, reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  });
  assert.equal(output.diagnostics?.length || 0, 0, `${path} syntax`);
}
console.log('TOSSIT V108 final-history recovery OK: stable IDs, completed-result reloading, corruption guards, History ack, UI wiring.');
