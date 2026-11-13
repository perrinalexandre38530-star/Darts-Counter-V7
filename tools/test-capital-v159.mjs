import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const paths = [
  'src/lib/capitalMatchInsights.ts',
  'src/components/stats/CapitalMatchRecap.tsx',
  'src/pages/CapitalPlay.tsx',
  'src/pages/HistoryPage.tsx',
];
let compiled = '';
for (const path of paths) {
  const result = ts.transpileModule(read(path), {fileName: path, reportDiagnostics: true,
    compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX}});
  assert.equal(result.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0, `Syntaxe TS/TSX ${path}`);
  if(path === paths[0]) compiled = result.outputText;
}
const {buildCapitalMatchInsights,capitalMatchHighlights} = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(compiled));
const players = [{id:'a',name:'Alice'}, {id:'b',name:'Bruno'}];
const contracts = ['capital','n20','double_any','bull'];
const v=(p,i,before,after,success)=>({playerId:p,contractId:contracts[i],contractIndex:i,scoreBefore:before,scoreAfter:after,delta:after-before,success});
const visits = [
  v('a',0,0,60,true),v('b',0,0,30,true),
  v('a',1,60,100,true),v('b',1,30,50,true),
  v('a',2,100,50,false),v('b',2,50,110,true),
  v('a',3,50,100,true),v('b',3,110,55,false),
];
const r=buildCapitalMatchInsights(players,contracts,visits);
assert.deepEqual(r.timeline.map(p=>p.values),[[0,0],[60,30],[100,50],[50,110],[100,55]]);
assert.equal(r.completedRounds,4);
assert.deepEqual([r.bestGain.playerId,r.bestGain.round,r.bestGain.amount],['b',3,60]);
assert.deepEqual([r.biggestLoss.playerId,r.biggestLoss.round,r.biggestLoss.amount],['b',4,-55]);
assert.deepEqual([r.longestStreak.playerId,r.longestStreak.count],['b',2]);
assert.deepEqual([r.lastLeadChange.playerId,r.lastLeadChange.round],['a',4]);
assert.deepEqual([r.maxCapital.playerId,r.maxCapital.value],['b',110]);
assert.equal(capitalMatchHighlights(r).timeline,undefined,'Pas de duplication de toute la chronologie dans History V4');
// Contract opening is never treated as a special-contract success/bonus.
assert.equal(r.bestGain.round,3);
// Incomplete round -> gap, no fabricated capital and no change of leader.
const partial=buildCapitalMatchInsights(players,contracts,visits.filter(x=>!(x.playerId==='b'&&x.contractIndex===3)));
assert.equal(partial.timeline[4].values[1],null);
assert.equal(partial.completedRounds,3);
assert.deepEqual([partial.lastLeadChange.playerId,partial.lastLeadChange.round],['b',3]);
// Tied round does not create a leader that does not exist.
const tied=buildCapitalMatchInsights(players,['capital','n20','n19'],[
  v('a',0,0,10,true),v('b',0,0,10,true),
  v('a',1,10,30,true),v('b',1,10,30,true),
  v('a',2,30,40,true),v('b',2,30,40,true),
]);
assert.equal(tied.lastLeadChange,null);
const play=read('src/pages/CapitalPlay.tsx'),history=read('src/pages/HistoryPage.tsx');
assert.match(play,/capitalHighlights: highlights/);
assert.match(play,/<CapitalMatchRecap players=\{capitalPlayers\} scores=\{scores\}/);
assert.match(history,/matchHighlights\.bestGain/);
assert.match(read('src/components/stats/CapitalMatchRecap.tsx'),/une courbe interrompue indique une volée absente/);
console.log('CAPITAL V159: chronologie fiable, records de match, changements de leader, contrats partiels, classement et Historique V4 OK.');
