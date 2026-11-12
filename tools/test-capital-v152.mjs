import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const read = file => readFileSync(new URL('../'+file,import.meta.url),'utf8');
const files = ['src/lib/capitalGame.ts','src/pages/CapitalConfig.tsx','src/pages/CapitalPlay.tsx','src/components/stats/CapitalContractMatrix.tsx'];
const compiled = {};
for(const file of files){
  const out = ts.transpileModule(read(file),{fileName:file,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}});
  const errors = (out.diagnostics || []).filter(d=>d.category===ts.DiagnosticCategory.Error);
  assert.deepEqual(errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[],`${file} : syntaxe`);
  compiled[file]=out.outputText;
}
const game = await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(compiled['src/lib/capitalGame.ts']));
const {applyCapitalAggregateVisit,applyCapitalVisit,buildCapitalPlayerStats,buildCapitalMatchStats,CAPITAL_GRID_PRESETS} = game;
// V156 durcit les saisies agrégées : aucun contrat d'impacts n'est validable
// par un total brut et un bouton « réussi » sans preuve des S/D/T.
const ok=(before,contract,score,success,expected,opts)=>assert.equal(applyCapitalAggregateVisit(before,contract,score,success,true,opts).scoreAfter,expected,contract);
ok(100,'capital',61,false,61);
assert.equal(applyCapitalAggregateVisit(100,'n20',60,true).requiresDetail,true);
assert.equal(applyCapitalAggregateVisit(100,'n20',60,true).scoreAfter,100);
assert.equal(applyCapitalAggregateVisit(101,'n20',60,false,false).scoreAfter,101);
ok(100,'exact_57',57,false,157);
ok(100,'exact_57',56,true,50);
for (const contract of ['peluche','petit_score','poubelle','shanghai','diagonal','triple_any','double_any','center']) {
  assert.equal(applyCapitalAggregateVisit(100,contract,20,true).requiresDetail,true,`${contract} nécessite les impacts`);
}
assert.equal(applyCapitalAggregateVisit(100,'shanghai',120,true,true,{shanghaiBonus:20},2).scoreAfter,100);
assert.equal(applyCapitalAggregateVisit(100,'diagonal',48,true,true,{},2).requiresDetail,true);

const players = [{id:'a',name:'A'},{id:'b',name:'B'}];
const visits = [
 {id:'v1',contractId:'capital',contractIndex:0,playerId:'a',playerIndex:0,playerName:'A',darts:[],scoreInputMode:'visit_score',dartsUsed:2,visitScore:80,bonusPoints:0,success:true,scoreBefore:0,scoreAfter:80,delta:80,penaltyLost:0,createdAt:1},
 {id:'v2',contractId:'n20',contractIndex:1,playerId:'a',playerIndex:0,playerName:'A',darts:[{v:20,mult:1},{v:0,mult:1},{v:5,mult:1}],visitScore:25,bonusPoints:0,success:true,scoreBefore:80,scoreAfter:105,delta:25,penaltyLost:0,createdAt:2},
 {id:'v3',contractId:'capital',contractIndex:0,playerId:'b',playerIndex:1,playerName:'B',darts:[{v:20,mult:1},{v:20,mult:1},{v:20,mult:1}],visitScore:60,bonusPoints:0,success:true,scoreBefore:0,scoreAfter:60,delta:60,penaltyLost:0,createdAt:3},
];
const stats=buildCapitalPlayerStats(players,visits,[105,60]);
assert.equal(stats[0].dartsThrown,5,'2 fléchettes de volée + 3 détaillées');
assert.equal(stats[0].knownDarts,3);
assert.equal(stats[0].unmeasuredDarts,2,'segments inconnus non inventés');
assert.equal(stats[0].hitCount,2);
assert.equal(stats[0].misses,1);
assert.equal(stats[0].rawPointsScored,105);
assert.equal(stats[0].avg3,63);
assert.equal(stats[0].hitRate,66.7);
assert.equal(stats[1].unmeasuredDarts,0);
const match=buildCapitalMatchStats(stats,[],visits);
assert.equal(match.totalDarts,8);
assert.equal(match.unmeasuredDarts,2);
assert.equal(match.knownDarts,6);
assert.equal(match.hitRate,83.3);

const cfg=read('src/pages/CapitalConfig.tsx');
const play=read('src/pages/CapitalPlay.tsx');
const matrix=read('src/components/stats/CapitalContractMatrix.tsx');
const app=read('src/App.tsx');
assert.match(cfg,/NativeStartOrderConfig/);
assert.match(cfg,/value: "visit_score", label: "Score volée"/);
assert.match(cfg,/"manual" \| "bull"/);
assert.match(play,/onSubmitVisitScore={requestVisitScore}/);
assert.match(play,/applyCapitalAggregateVisit/);
assert.match(play,/CapitalContractMatrix/);
assert.match(play,/initialTab={liveStatsInitialTab}/);
assert.match(play,/TABLEAU · CONTRATS \/ JOUEURS/);
assert.doesNotMatch(play,/>RÈGLE DU CONTRAT/);
assert.match(matrix,/#4dff89/);
assert.match(matrix,/#ffad45/);
assert.match(matrix,/visit\.scoreAfter/);
assert.match(app,/ChoiceStartOrderModal/);
assert.match(app,/readStartParticipants/);
assert.match(app,/startOrderMode/);
assert.equal(CAPITAL_GRID_PRESETS.legends.contracts.length,30);
console.log('CAPITAL V152: ordre MANUEL/BULL, Score volée (statistiques mixtes exactes), tableau live/final et suppression bandeau : OK.');
