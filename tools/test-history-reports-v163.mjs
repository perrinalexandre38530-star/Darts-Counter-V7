/** Regression checks for History V4 report extraction, independent of the DOM. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const projectRoot = path.resolve(import.meta.dirname, '..');
const src = fs.readFileSync(path.join(projectRoot,'src/lib/challengeResultsExport.ts'),'utf8');
const out = ts.transpileModule(src,{
 fileName:'challengeResultsExport.ts',reportDiagnostics:true,
 compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,
   esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX},
});
const errors=(out.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
assert.equal(errors.length,0,errors.map(e=>ts.flattenDiagnosticMessageText(e.messageText,' ')).join('\n'));
const exports={};
vm.runInNewContext(out.outputText,{
 exports,console,require(specifier){
  if(specifier.includes('challengeFullReport')) return {enrichChallengeReport: report=>report};
  if(specifier.includes('historyDartsModeReport')) return {enrichHistoricalDartsModeReport: report=>report};
  if(specifier.includes('historySportReport')) return {applyHistoricalSportResult: report=>report};
  if(specifier==='fflate')return {zipSync:()=>new Uint8Array()};
  if(specifier.endsWith('.png')||specifier.endsWith('.webp'))return specifier;
  throw Error('Unexpected import: '+specifier);
 },
}, {filename:'challengeResultsExport.cjs'});
const {visualReportFromHistory,challengeReportFromHistory}=exports;
assert.equal(typeof visualReportFromHistory,'function');

// The actual mode may live in summary while game.mode is only the sport.
const x01=visualReportFromHistory({
 kind:'darts',game:{mode:'darts',startScore:501},
 summary:{mode:'x01',title:'X01',rankings:[{id:'a',name:'Ninja',score:0,rank:1},
   {id:'b',name:'Chevroute',score:161,rank:2}],
  setsWonByPlayer:{a:2,b:1},legsWonByPlayer:{a:5,b:3},
  detailedByPlayer:{a:{totalPointsScored:2661,avg3:42.34,bestVisit:113},
    b:{totalPointsScored:2799,avg3:40.59,bestVisit:100}}},
});
assert.equal(x01.matchType,'x01');
assert.match(x01.tickerSrc||'',/ticker_x01/);
assert.match(x01.players[0].scoreDisplay||'',/2 SETS/);
assert.match(x01.players[0].scoreDisplay||'',/5 LEGS/);
assert.equal(x01.players[0].metrics.find(m=>m.label==='PTS MARQUÉS')?.value,'2661');
assert.notEqual(x01.players[0].scoreDisplay,'0 PTS');

// Cricket report must promote actual cricket metrics, not irrelevant AVG3.
const cricket=visualReportFromHistory({
 game:{mode:'darts'},summary:{mode:'cricket',rankings:[
  {id:'c',name:'Alex',score:210,stats:{mpr:3.25,marks:32,closedSectors:5,dartsThrown:42}}
 ]}
});
assert.match(cricket.tickerSrc||'',/ticker_cricket/);
assert.deepEqual(Array.from(cricket.players[0].headlineMetrics||[], m=>m.label),
 ['MPR','MARQUES','SECTEURS FERMÉS','FLÉCHETTES']);

// Missing Challenge measurements must remain unknown, never 0% / 0 darts.
const legacy=challengeReportFromHistory({kind:'challenge',summary:{title:'JDC',perPlayer:[{name:'Test'}]}});
assert.equal(legacy.players[0].accuracy,null);
assert.equal(legacy.players[0].darts,null);
assert.ok(Number.isNaN(legacy.players[0].score));
assert.ok(!legacy.highlight.some(m=>m.value==='NaN PTS'||m.value==='0%'));
const recordedZero=challengeReportFromHistory({kind:'challenge',summary:{perPlayer:[{name:'Test',score:0,darts:3,hitCount:0}]}});
assert.equal(recordedZero.players[0].score,0);
assert.equal(recordedZero.players[0].accuracy,0);

// Players having different explicit profile IDs cannot steal each other's
// statistics solely because they share a displayed nickname.
const separate=visualReportFromHistory({game:{mode:'cricket'},summary:{mode:'cricket',rankings:[{id:'new',name:'Ninja',score:50}]},
 payload:{players:[{id:'old',name:'Ninja',stats:{mpr:7.77}}]}});
assert.ok(!separate.players[0].metrics.some(m=>m.label==='MPR'&&m.value==='7.77'));

console.log('PASS: X01 mode, sets/legs, Cricket stats, unknown Challenge values, duplicate profile IDs');

// X01: two profiles named Ninja must not share stats/legs via name fallback.
const duplicateX01 = visualReportFromHistory({
 game:{mode:'x01'},summary:{mode:'x01',rankings:[
  {id:'new-a',name:'Ninja',rank:1,score:0},
  {id:'new-b',name:'Ninja',rank:2,score:67},
 ], detailedByPlayer:{'old-id':{id:'old-id',name:'Ninja',avg3:88.88,setsWon:4,legsWon:7}},
 visitHistory:[{playerId:'old-id',scored:180}],
 }});
for(const player of duplicateX01.players){
 assert.ok(!player.metrics.some(m=>m.label==='AVG3'&&m.value==='88.88'));
 assert.ok(!player.scoreDisplay?.includes('4 SETS'));
 assert.equal(player.visits.length,0);
}

// X01: saved score field may mean remaining score. Only explicit scored points
// can safely be aggregated from that ambiguous visit structure.
const visitsX01 = visualReportFromHistory({game:{mode:'darts'},summary:{mode:'x01',
 rankings:[{id:'a',name:'Alpha',rank:1,score:0}],setsWonByPlayer:{a:1},legsWonByPlayer:{a:2},
 visitHistory:[
  {playerId:'a',score:301,remaining:301}, // not 301 points scored
  {playerId:'a',score:301,remaining:251,scored:50},
  {playerId:'a',pointsScored:95},
 ],
}});
assert.equal(visitsX01.players[0].metrics.find(m=>m.label==='PTS MARQUÉS')?.value,'145');
assert.equal(visitsX01.rounds,3);
assert.equal(visitsX01.unit,'volées enregistrées');

// Challenge exercise: unknown-owner log events cannot be assigned to every
// participant, even when the legacy ranking has no profile identifiers.
const fullSrc=fs.readFileSync(path.join(projectRoot,'src/lib/challengeFullReport.ts'),'utf8');
const fullOut=ts.transpileModule(fullSrc,{
 fileName:'challengeFullReport.ts',reportDiagnostics:true,
 compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true},
});
assert.equal((fullOut.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
const exerciseExports={};
vm.runInNewContext(fullOut.outputText,{
 exports:exerciseExports,console,
 require(specifier){
  if(specifier.includes('challengeExercises')) return {challengeExerciseType:()=> 'jdc'};
  throw Error('Unexpected import in full report: '+specifier);
 },
});
const playersWithoutIds=['Joueur A','Joueur B'].map(name=>({
 name,score:30,accuracy:null,darts:null,bestStreak:null,avgVisit:null,metrics:[],visits:[],
}));
const unowned=exerciseExports.enrichChallengeReport({
 title:'JDC',rounds:2,unit:'volées',players:playersWithoutIds,highlight:[],date:'11/11/2026',
},{exerciseType:'jdc',target:'10',visits:2},[
 {hit:'S',segment:10},{hit:'D',segment:10},{hit:'MISS'},
],[{name:'Joueur A',hitSummary:{S:2}},{name:'Joueur B',hitSummary:{D:1}}]);
assert.ok(unowned.details.every(s=> !s.title.includes('JOURNAL DE TOUTES LES VOLÉES')));
assert.ok(unowned.details.every(s=> !s.title.includes('PERFORMANCE PAR CIBLE')));
console.log('PASS: X01 duplicate IDs, visit points vs remaining, multiplayer Challenge ownership');

// A Challenge ranking in summary.perPlayer may hold only score/name, while
// payload.stats.players stores the complete dart-level exercise counters.
const mixedChallenge=challengeReportFromHistory({kind:'challenge',
 summary:{exerciseType:'jdc',perPlayer:[{id:'ninja',name:'Ninja',score:740},
  {id:'guest',name:'Invité',score:20}]},
 payload:{config:{exerciseType:'jdc',target:'10',visits:19},stats:{players:[
  {id:'ninja',name:'Ninja',darts:57,hitCount:45,bestVisit:120,
   exerciseStats:{jdcPhaseScores:[139,300,301],jdcShanghaiCount:0}},
  {id:'other-profile',name:'Invité',darts:777,hitCount:777},
 ]}},
});
assert.equal(mixedChallenge.players.find(p=>p.name==='Ninja')?.darts,57);
assert.equal(mixedChallenge.players.find(p=>p.name==='Ninja')?.score,740);
assert.equal(mixedChallenge.players.find(p=>p.name==='Ninja')?.metrics.find(m=>m.label==='PHASE 1')?.value,'139 PTS');
assert.equal(mixedChallenge.players.find(p=>p.name==='Invité')?.darts,null);
console.log('PASS: split Challenge rankings/stats preserve participant IDs and authoritative scores');

// The same legacy ranking can occur twice in summary + source. It must not
// be mistaken for two different participants when matching old stats.
const copiedRanking=visualReportFromHistory({game:{mode:'x01'},summary:{
 mode:'x01',rankings:[{name:'Chevroute',setsWon:1,legsWon:2,rank:1,score:0}],
}});
assert.match(copiedRanking.players[0].scoreDisplay||'',/1 SET/);
assert.match(copiedRanking.players[0].scoreDisplay||'',/2 LEGS/);
console.log('PASS: duplicated legacy ranking projection does not hide match results');
