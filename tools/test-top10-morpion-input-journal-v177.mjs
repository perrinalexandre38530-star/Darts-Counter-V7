/** V177: execute the real gameplay input handlers, without React or Android.
 * Simulates fast keypad clicks before the next React paint, an abrupt restart,
 * blocked localStorage, and read-only/ongoing-save barriers.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { savePartialVisit, loadPartialVisit, previousVisitFingerprint } from '../src/lib/partialVisitDraft.ts';

const require = createRequire(import.meta.url);
// The project has TypeScript in devDependencies. TYPESCRIPT_PATH is only needed
// for standalone/offline test environments without npm-installed dependencies.
const ts = require(process.env.TYPESCRIPT_PATH || 'typescript');

function extractInputHandlers(page) {
  const path = `src/pages/${page}.tsx`;
  const source = readFileSync(path, 'utf8');
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.deepEqual(ast.parseDiagnostics, [], `${page}: syntax parses`);
  const fns = new Map();
  const walk = (node) => {
    if (ts.isFunctionDeclaration(node) && ['rememberInput', 'appendInput'].includes(node.name?.text))
      fns.set(node.name.text, node.getText(ast));
    ts.forEachChild(node, walk);
  };
  walk(ast);
  assert.equal(fns.size, 2, `${page}: real event handlers are present`);
  assert.match(source, /onDirectDart=\{appendInput\}/, `${page}: delayed preset darts use the ref-safe handler`);
  assert.match(source, /onValidate=\{\(\) => commit\(inputDartsRef\.current\)\}/, `${page}: validate uses latest ref`);
  assert.match(source, /Stockage local indisponible : la volée en cours/, `${page}: storage failure is visible`);
  if (page === "Top10Play") assert.match(source, /!finished && !window\.confirm\("Démarrer une nouvelle partie/, "TOP 10: reset requires confirmation");
  assert.match(source, /if \(!preview && inputDartsRef\.current\.length > 0\)/, `${page}: back button sees latest darts`);
  const generated = ts.transpileModule([...fns.values()].join('\n'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
    reportDiagnostics: true,
  });
  assert.equal(generated.diagnostics?.length ?? 0, 0);
  return generated.outputText;
}

for (const [page, mode, hasRoundResult] of [
  ['Top10Play', 'top_10', false], ['TicTacToePlay', 'tic_tac_toe', true],
]) {
  const map = new Map();
  globalThis.window = { localStorage: {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
  } };
  const identity = { mode, matchId: `v177-${mode}`, playerId: 'profile-a', round: 0,
    current: 0, committedVisits: 0, previousVisit: previousVisitFingerprint([]) };
  const eventOrder = [];
  let rendered = [];
  let multiplier = 1;
  let storageWarning = false;
  const ctx = {
    hydration: 'ready', preview: false, finished: false, result: null,
    who: { id: 'profile-a', isBot: false }, currentPlayer: { id: 'profile-a', isBot: false },
    leavingRef: { current: false }, writerRef: { current: { isBusy: false, hasError: false } },
    id: { current: identity.matchId }, round: 0, current: 0, visits: { current: [] },
    inputDartsRef: { current: [] }, inputMultRef: { current: 1 },
    draftIdentity: () => identity,
    savePartialVisit: (...args) => { eventOrder.push('save'); return savePartialVisit(...args); },
    setThrowing: (d) => { eventOrder.push('state'); rendered = d; },
    setMult: (m) => { multiplier = m; },
    setRestoredDraft: () => {},
    setDraftStorageUnavailable: (state) => { storageWarning = state; },
  };
  runInNewContext(extractInputHandlers(page) + '\nthis.rememberInput = rememberInput; this.appendInput = appendInput;', ctx);

  // 3 taps without any React rerender: must not lose the 1st or 2nd dart.
  ctx.appendInput({ v: 20, mult: 3 });
  ctx.appendInput({ v: 25, mult: 2 });
  ctx.appendInput({ v: 0, mult: 1 });
  assert.deepEqual(JSON.parse(JSON.stringify(rendered)), [
    { v: 20, mult: 3 }, { v: 25, mult: 2 }, { v: 0, mult: 1 },
  ], `${page}: rapid input stays ordered`);
  assert.equal(loadPartialVisit(identity)?.darts.length, 3, `${page}: immediately crash-recoverable`);
  assert.deepEqual(eventOrder, ['save', 'state', 'save', 'state', 'save', 'state'], `${page}: storage precedes React state`);
  ctx.appendInput({ v: 7, mult: 1 });
  assert.equal(loadPartialVisit(identity)?.darts.length, 3, '4th dart ignored');
  ctx.rememberInput(ctx.inputDartsRef.current.slice(0, -1));
  assert.equal(loadPartialVisit(identity)?.darts.length, 2, 'backspace saved without rendering');
  ctx.rememberInput(ctx.inputDartsRef.current, 2);
  assert.equal(loadPartialVisit(identity)?.multiplier, 2, 'multiplier change preserved');
  assert.equal(multiplier, 2);

  ctx.preview = true;
  ctx.appendInput({ v: 8, mult: 1 });
  assert.equal(loadPartialVisit(identity)?.darts.length, 2, 'preview is read-only');
  ctx.preview = false;
  ctx.writerRef.current.isBusy = true;
  ctx.appendInput({ v: 8, mult: 1 });
  assert.equal(loadPartialVisit(identity)?.darts.length, 2, 'pending checkpoint blocks input');
  ctx.writerRef.current.isBusy = false;
  if (hasRoundResult) {
    ctx.result = { winner: 0, draw: false };
    ctx.appendInput({ v: 8, mult: 1 });
    assert.equal(loadPartialVisit(identity)?.darts.length, 2, 'finished morpion round blocks delayed preset');
    ctx.result = null;
  }
  ctx.rememberInput([], 1);
  assert.equal(loadPartialVisit(identity), null, 'cancel erases draft immediately');

  globalThis.window = { localStorage: { setItem: () => { throw Error('quota'); }, getItem: () => null, removeItem: () => {} } };
  ctx.appendInput({ v: 19, mult: 1 });
  assert.equal(rendered.length, 1, 'storage failure does not block gameplay');
  assert.equal(storageWarning, true, 'storage failure shows visible warning');
  console.log(`OK V177 ${page}: immediate 3-dart journaling, crash, delayed taps, guards, storage quota`);
}
