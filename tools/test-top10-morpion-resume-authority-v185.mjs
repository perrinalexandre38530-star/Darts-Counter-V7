/** V185 — reprise de parties Morpion avec config de navigation périmée.
 * Le format enregistré dans game.maxRounds prime sur bestOf/rounds résiduels.
 * Exécute la vraie fonction de récupération, sans navigateur ni données privées.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { newMorpionGrid, morpionWinner, morpionIsDraw } from '../src/lib/morpionEngine.ts';
import { resolveMorpionFormat } from '../src/lib/morpionMatchFormat.ts';

const require = createRequire(import.meta.url);
const ts = require(process.env.TYPESCRIPT_PATH || 'typescript');
const path = 'src/lib/recoverTop10Morpion.ts';
const source = readFileSync(path, 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
}, reportDiagnostics: true });
assert.equal(compiled.diagnostics?.length ?? 0, 0);
const exports = {};
runInNewContext(compiled.outputText, {
  exports, require: (specifier) => {
    if (specifier === './morpionEngine') return { morpionWinner, morpionIsDraw };
    if (specifier === './morpionMatchFormat') return { resolveMorpionFormat };
    throw new Error(`Unexpected import: ${specifier}`);
  }, Date, Number, String, Math, Object, Array, Set,
});
const { recoverMorpion } = exports;
const players = [
  { id:'local-a', name:'Alice', isBot:false },
  { id:'local-b', name:'Bob', isBot:false },
];
const grid = newMorpionGrid(2, () => .42);
function checkpoint(maxRounds, payloadConfig, roundIdx, overrides = {}) {
  const rec = {
    id:'match-v185', matchId:'match-v185', kind:'tic_tac_toe', status:'in_progress', players,
    game: maxRounds === undefined ? { mode:'tic_tac_toe' } : { mode:'tic_tac_toe', maxRounds },
    resume: { livePayload: {
      config: payloadConfig, grid, matchWins:[1,1], roundIdx, currentPlayerIndex:0,
      roundResult:null, visitHistory:[{playerId:'local-a'}, {playerId:'local-b'}],
    } },
  };
  return { ...rec, ...overrides };
}

const five = recoverMorpion(checkpoint(5, {players, rounds:3, bestOf:3}, 3));
assert.ok(five, '5-round game survives stale 3-round config');
assert.deepEqual(resolveMorpionFormat(five.config), {maxRounds:5,requiredWins:3});
assert.equal(five.round,3);
assert.equal(five.current,0);
assert.equal(five.config.rounds,5);
assert.equal(five.config.bestOf,5);

const seven = recoverMorpion(checkpoint(7, {players, rounds:3, bestOf:5}, 6));
assert.ok(seven, '7-round game survives stale bestOf and rounds');
assert.equal(resolveMorpionFormat(seven.config).maxRounds,7);

const old = recoverMorpion(checkpoint(undefined,{players,rounds:5},3));
assert.ok(old, 'old games without game.maxRounds preserve config');
assert.equal(resolveMorpionFormat(old.config).maxRounds,5);

assert.equal(recoverMorpion(checkpoint(3, {players, rounds:5}, 3)), null,
  'rejects roundIdx 3 against authoritative 3-round limit');
assert.ok(recoverMorpion(checkpoint(0,{players,rounds:5},3)),
  'invalid game.maxRounds does not erase valid legacy format');
assert.ok(recoverMorpion(checkpoint(undefined,{players},1)),
  'legacy game without format keeps default of 3');

const winningGrid = newMorpionGrid(2,()=>.34);
for (const i of [0,1,2]) { winningGrid.owners[i]=0; winningGrid.marks[i][0]=4; }
const completed = checkpoint(5, {players, rounds:3,bestOf:3}, 4);
completed.status = 'finished'; completed.finishedAt = 456;
completed.winnerId = 'local-a';
completed.payload = {
  ...completed.resume.livePayload, grid:winningGrid, matchWins:[3,1], roundIdx:4,
  roundResult:{winner:0,draw:false},
};
assert.equal(recoverMorpion(completed),null,'finished match never resumes in edit mode');
const preview = recoverMorpion(completed,{preview:true});
assert.ok(preview, 'completed 5-round match can be inspected despite stale config');
assert.equal(resolveMorpionFormat(preview.config).maxRounds,5);
assert.equal(preview.winnerId,'local-a');
assert.equal(preview.finished,true);
console.log('OK V185: authoritative 5/7-round resume, legacy 3/5, corrupt format gate, finished preview');
