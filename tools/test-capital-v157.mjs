import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const read = file => readFileSync(new URL('../'+file, import.meta.url), 'utf8');
const sources=['src/lib/capitalGame.ts','src/pages/CapitalPlay.tsx','src/components/stats/CapitalContractMatrix.tsx','src/lib/capitalHistoryQueue.ts'];
let code='';
for(const path of sources){
  const r=ts.transpileModule(read(path),{fileName:path,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}});
  assert.equal(r.diagnostics.filter(x=>x.category===ts.DiagnosticCategory.Error).length,0, `Invalid TS: ${path}`);
  if(path===sources[0])code=r.outputText;
}
const lib=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(code));
const {applyCapitalVisit,applyCapitalAggregateVisit,auditCapitalVisitLog,buildCapitalPlayerStats,buildCapitalMatchStats}=lib;
const S=v=>({v,mult:1}),D=v=>({v,mult:2}),T=v=>({v,mult:3}),MISS={v:0,mult:1,zone:'miss'};
const players=[{id:'a',name:'A'},{id:'b',name:'B'}], contracts=['capital','n20','exact_42'];
const visits=[]; const score=[0,0];
function hit(id,index,darts){
 const pi=players.findIndex(p=>p.id===id);
 const before=score[pi]; const contract=contracts[index];const applied=applyCapitalVisit(before,contract,darts);
 score[pi]=applied.scoreAfter;
 visits.push({id:`${id}-${index}`,playerId:id,playerIndex:pi,contractIndex:index,contractId:contract,
   darts,scoreInputMode:'keypad',dartsUsed:3,scoreBefore:before,createdAt:1+visits.length,...applied});
}
hit('a',0,[S(20),T(5),D(20)]); // 75
hit('b',0,[S(5),S(5),S(5)]); // 15
hit('a',1,[T(20),T(5),S(1)]); // add 60
hit('b',1,[S(19),T(5),S(1)]); // half to 7
hit('a',2,[D(20),S(2),MISS]); // +42
hit('b',2,[S(1),S(2),S(3)]); // 3
assert.deepEqual(score,[177,3]);
const audit=auditCapitalVisitLog(players,contracts,visits,{expectedScores:score});
assert.equal(audit.ok,true,JSON.stringify(audit.issues));
assert.equal(audit.checkedVisits,6);assert.deepEqual(audit.replayedScores,score);
const stats=buildCapitalPlayerStats(players,visits,score);
assert.equal(stats[0].pointsWon,102);assert.equal(stats[0].rawPointsScored,75+76+42);
assert.equal(stats[1].capitalLost,12);assert.equal(stats[1].finalCapital,3);
assert.equal(stats[0].outsideHits,0);assert.equal(stats[1].outsideHits,0);
const match=buildCapitalMatchStats(stats,[],visits);assert.equal(match.totalPointsWon,102);
// Un score historique erroné est signalé, jamais remplacé ni sauvegardé.
const broken=visits.map(v=>({...v,darts:v.darts.map(x=>({...x}))}));
broken[2].visitScore=76;broken[2].scoreAfter=151;
const report=auditCapitalVisitLog(players,contracts,broken,{expectedScores:score});
assert.equal(report.ok,false);assert(report.issues.some(x=>x.code==='qualified_score'));
assert(report.issues.some(x=>x.code==='score_after'));
assert.equal(broken[2].scoreAfter,151); // no auto repair
// Contrat impossible à vérifier avec une somme : doit rester signalé.
const missing=[{...visits[2],darts:[],scoreInputMode:'visit_score',rawVisitScore:76,scoreBefore:0}];
const notVerifiable=auditCapitalVisitLog(players,['n20'],[{...missing[0],contractIndex:0}],{expectedScores:[0,0]});
assert(notVerifiable.issues.some(x=>x.code==='unverifiable_aggregate'));
// Les anciennes volées « score exact » enregistrées sans impacts restent vérifiables.
const agg=applyCapitalAggregateVisit(100,'exact_42',42,true,true,{},2);
const exactLog=[{id:'aggregate',playerId:'a',playerIndex:0,contractIndex:0,contractId:'exact_42',darts:[],scoreInputMode:'visit_score',dartsUsed:2,
 rawVisitScore:42,scoreBefore:100,createdAt:1,...agg}];
const aggAudit=auditCapitalVisitLog(players,['exact_42'],exactLog,{includeCapital:false,startingCapital:100,expectedScores:[142,100]});
assert.equal(aggAudit.ok,true,JSON.stringify(aggAudit.issues));
// FIFO réel, y compris lorsqu'une sauvegarde intermédiaire échoue.
const queueSource=ts.transpileModule(read('src/lib/capitalHistoryQueue.ts'), { fileName:'src/lib/capitalHistoryQueue.ts',compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {createCapitalHistoryWriteQueue}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(queueSource));
const recorded=[];
const enqueue=createCapitalHistoryWriteQueue(async record=>{
 await new Promise(resolve=>setTimeout(resolve,record.delay));
 if(record.fail)throw Error('temporary checkpoint error');
 recorded.push(record.status);
},()=>{});
const first=enqueue({status:'live-1',delay:10});
const second=enqueue({status:'live-2',delay:1,fail:true}).catch(()=>{});
const finish=enqueue({status:'finished',delay:0});
await Promise.all([first,second,finish]);
assert.deepEqual(recorded,['live-1','finished']);
const play=read('src/pages/CapitalPlay.tsx');
assert.match(play,/createCapitalHistoryWriteQueue/);
assert.match(play,/roundIdx: savedRoundIndex, playerIdx: savedPlayerIndex/);
assert.match(play,/capitalIntegrity: capitalAuditSummary/);
assert.doesNotMatch(play,/buildDartsTelemetry\(progress, progress\.payload\)/, 'no heavy telemetry at every checkpoint');
assert.match(play,/buildDartsTelemetry\(record, record\.payload\)/, 'full telemetry persisted on finish');
assert.match(play,/aucune correction automatique n'est appliquée/);
assert.equal((play.match(/void enqueueCapitalHistoryWrite\(/g)||[]).length,2);
console.log('CAPITAL V157: audit non destructif OK, scores/volées cohérents, chronologie checkpoints FIFO, prochain tour et historique final contrôlés.');
