/** V182: a match resumes with its authoritative format, never the router default.
 * Exercises the real recovery module (transpiled in memory) and the actual
 * Morpion page's hydration wiring, without a browser or a remote backend.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { newMorpionGrid, morpionWinner, morpionIsDraw } from '../src/lib/morpionEngine.ts';
import { resolveMorpionFormat } from '../src/lib/morpionMatchFormat.ts';

const require = createRequire(import.meta.url);
const ts = require(process.env.TYPESCRIPT_PATH || 'typescript');
const file = 'src/lib/recoverTop10Morpion.ts';
const source = readFileSync(file, 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
}, reportDiagnostics: true });
assert.equal(compiled.diagnostics?.length ?? 0, 0, 'recovery module transpiles');
const moduleExports = {};
runInNewContext(compiled.outputText, {
  exports: moduleExports,
  require: (specifier) => {
    if (specifier === './morpionEngine') return { morpionWinner, morpionIsDraw };
    if (specifier === './morpionMatchFormat') return { resolveMorpionFormat };
    throw new Error(`unexpected import ${specifier}`);
  },
  Date, Number, String, Math, Object, Array, Set,
});
const { recoverMorpion } = moduleExports;
const players = [{id:'a',name:'A',isBot:false},{id:'b',name:'B',isBot:false}];
const grid = newMorpionGrid(2, () => 0.36);
const checkpoint = {
  id:'v182-five-rounds', matchId:'v182-five-rounds', kind:'tic_tac_toe',
  status:'in_progress', players,
  game: { mode:'tic_tac_toe', maxRounds:5 },
  // Simulate old History cards that carry no route config, but a valid payload.
  resume: { livePayload: {
    grid, matchWins:[1,1], roundIdx:3, currentPlayerIndex:1,
    roundResult:null, visitHistory:[{playerId:'a'}, {playerId:'b'}],
  } },
};
const restored = recoverMorpion(checkpoint);
assert.ok(restored, '5-round game restored even when router and payload config are missing');
assert.equal(resolveMorpionFormat(restored.config).maxRounds, 5, 'game.maxRounds recovered');
assert.equal(resolveMorpionFormat(restored.config).requiredWins, 3, '3 wins needed in BO5');
assert.equal(restored.round, 3);
assert.equal(restored.current, 1);
assert.equal(recoverMorpion({...checkpoint, game:{mode:'tic_tac_toe',maxRounds:3}}), null,
  'an inconsistent smaller format is rejected rather than resetting the game');
for (const rounds of [1,3,5,7,25]) {
  const result = resolveMorpionFormat({rounds});
  assert.equal(result.maxRounds, rounds);
  assert.equal(result.requiredWins, Math.floor(rounds/2)+1);
}
assert.equal(resolveMorpionFormat({}).maxRounds, 3, 'legacy default preserved');
assert.equal(resolveMorpionFormat({rounds:Infinity}).maxRounds, 3);
assert.equal(resolveMorpionFormat({rounds:3.5}).maxRounds, 3);
assert.equal(resolveMorpionFormat({rounds:0}).maxRounds, 3, 'zero preserves old fallback');
const page = readFileSync('src/pages/TicTacToePlay.tsx','utf8');
assert.match(page, /React\.useState\(\(\) => resolveMorpionFormat\(cfg\)\)/,
  'match format participates in React state');
assert.match(page, /setMatchFormat\(resolveMorpionFormat\(restored\.config\)\)/,
  'hydration installs authoritative saved match format');
assert.match(page, /const \{ maxRounds, requiredWins \} = matchFormat;/,
  'gameplay derives end-of-match rules from hydrated format');
const ast = ts.createSourceFile('src/pages/TicTacToePlay.tsx', page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
assert.equal(ast.parseDiagnostics.length, 0, 'Morpion screen parses');
console.log('OK V182: 5-round resume without route config, format authority, stale format rejection, rules & TSX');
