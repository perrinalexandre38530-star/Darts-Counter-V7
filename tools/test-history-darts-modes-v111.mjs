/** Regression contract — archived Capital, Killer, Shanghai and legacy modes. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); }
catch { ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript'); }
const files=(name)=>readFileSync(new URL('../src/lib/'+name+'.ts',import.meta.url),'utf8');
const compile=(name,stub=()=>{throw Error('module unavailable')})=>{
  const transpiled=ts.transpileModule(files(name),{fileName:name+'.ts',reportDiagnostics:true,
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
  assert.equal(transpiled.diagnostics?.length,0,`${name} syntax`);
  const module={exports:{}};
  new Function('require','module','exports',transpiled.outputText)(stub,module,module.exports);
  return module.exports;
};
const adapter=compile('historyDartsModeReport');
const make=(players)=>({title:'PARTIE',rounds:3,unit:'tours',date:'12/11/2026',
  players,highlight:[],configSummary:[],details:[]});
const p=(id,name,score=NaN)=>({name,participantId:id,score,accuracy:null,darts:null,bestStreak:null,
  avgVisit:null,metrics:[],visits:[]});
const capitalEntry={kind:'capital',status:'finished',summary:{mode:'capital',
  capitalVariant:{id:'bar17',label:'DIAGONALE'},capitalIntegrity:{verified:true},
  players:[{id:'n',name:'Ninja',score:158,finalCapital:158,pointsWon:75,capitalLost:22,
    successfulContracts:3,failedContracts:1,dartsThrown:12,contractStats:{
      n20:{attempts:1,successes:1,failures:0,pointsWon:60,capitalLost:0},
      diagonal:{attempts:1,successes:0,failures:1,pointsWon:0,capitalLost:22},
    }}],contracts:[{id:'n20',label:'20'},{id:'diagonal',label:'Diagonale'}]},
  payload:{config:{startingCapital:105,failDivideBy2:true},visits:[
    {contractIndex:0,contractId:'capital',playerId:'n',scoreBefore:0,scoreAfter:105,delta:105,success:true,rawVisitScore:105},
    {contractIndex:1,contractId:'n20',playerId:'n',scoreBefore:105,scoreAfter:165,delta:60,success:true,rawVisitScore:60},
    {contractIndex:2,contractId:'diagonal',playerId:'n',scoreBefore:165,scoreAfter:143,delta:-22,success:false,rawVisitScore:18},
  ]}};
const cap=adapter.enrichHistoricalDartsModeReport(make([p('n','Ninja',158)]),capitalEntry,'capital');
assert.equal(cap.players[0].scoreDisplay,'158 CAPITAL');
assert.ok(cap.players[0].headlineMetrics.some(m=>m.label==='CONTRATS RÉUSSIS'&&m.value==='3'));
assert.ok(cap.details.some(s=>s.title.includes('CONTRATS')&&s.rows.some(r=>r[0]==='Diagonale'&&r[3]==='1')));
assert.ok(cap.details.some(s=>s.title.includes('ÉVOLUTION DU MATCH')&&s.rows.some(r=>r[4]==='-22')));
assert.equal(cap.configSummary.find(m=>m.label==='PÉNALITÉ ÷2')?.value,'OUI');
const killerEntry={kind:'killer',summary:{mode:'killer',livesStart:5,variantId:'classic',
  rankings:[{id:'n',name:'Ninja',rank:1},{id:'c',name:'Chevroute',rank:2}],
  detailedByPlayer:{n:{id:'n',kills:4,lives:2,totalThrows:17,livesTaken:6,eliminated:false,hitsByNumber:{20:3}},
    c:{id:'c',kills:1,lives:0,totalThrows:20,livesTaken:1,eliminated:true}}}};
const kill=adapter.enrichHistoricalDartsModeReport(make([p('n','Ninja',1),p('c','Chevroute',0)]),killerEntry,'killer');
assert.equal(kill.players[0].scoreDisplay,'4 ÉLIMINATIONS');
assert.ok(Number.isNaN(kill.players[0].score),'Kill ranking must not masquerade as points');
assert.equal(kill.players[1].headlineMetrics.find(m=>m.label==='VIES RESTANTES')?.value,'0');
assert.ok(kill.details.some(s=>s.title.includes('SECTEUR')&&s.rows[0][0]==='20'));
const otherId=adapter.enrichHistoricalDartsModeReport(make([p('n','Ninja')]),{summary:{detailedByPlayer:{c:{id:'c',kills:40}}}},'killer');
assert.ok(!otherId.players[0].metrics.some(m=>m.label==='ÉLIMINATIONS'), 'Wrong profile ID must not leak');
const shanghaiEntry={kind:'shanghai',players:[{id:'n',name:'Ninja',avatarDataUrl:'data:image/png;base64,abc'},
  {id:'c',name:'Chevroute',avatarDataUrl:'data:image/png;base64,xyz'}],
  summary:{mode:'shanghai',winRule:'shanghai_or_points',winnerId:'n',
    scores:[{id:'n',name:'Ninja',score:90},{id:'c',name:'Chevroute',score:110}]},
  payload:{statsShanghai:{hitsById:{n:{20:{S:1,D:1,T:1,MISS:0,points:120}},
    c:{20:{S:2,D:0,T:1,MISS:1,points:100}}},
    scoreTimelineById:{n:[0,30,90],c:[0,40,110]}}}};
const sha=adapter.enrichHistoricalDartsModeReport(make([p('n','Ninja'),p('c','Chevroute')]),shanghaiEntry,'shanghai');
assert.equal(sha.players[0].name,'Ninja','Shanghai winner by Shanghai rule must remain first');
assert.equal(sha.players[0].score,90,'Saved scoreboard is source of truth, not summed per-target counts');
assert.equal(sha.players[0].avatarUrl,'data:image/png;base64,abc');
assert.deepEqual(sha.players[0].visits,[30,60]);
assert.ok(sha.details.some(s=>s.title.includes('CIBLES')&&s.rows[0][2]==='1'));
const preserved=make([p('n','Ninja',1)]);
assert.strictEqual(adapter.enrichHistoricalDartsModeReport(preserved,{kind:'x01'},'x01'),preserved);
// Integration through the generator — no browser / Canvas required.
const sport=compile('historySportReport');
const generator=compile('challengeResultsExport',(id)=>{
  if(id==='./historyDartsModeReport')return adapter;
  if(id==='./historySportReport')return sport;
  if(id==='./challengeFullReport')return {enrichChallengeReport:r=>r};
  if(id==='fflate')return {zipSync:()=>new Uint8Array()};
  if(/\.(png|webp|jpe?g)$/.test(id))return {default:'/ticker/'+id.split('/').at(-1)};
  throw Error('unexpected import '+id);
});
const capitalV4=generator.visualReportFromHistory(capitalEntry);
assert.equal(capitalV4.players[0].scoreDisplay,'158 CAPITAL');
assert.ok(capitalV4.tickerSrc.includes('ticker_capital'));
const killerV4=generator.visualReportFromHistory(killerEntry);
assert.equal(killerV4.players[0].scoreDisplay,'4 ÉLIMINATIONS');
assert.ok(!killerV4.highlight.some(m=>m.label==='SCORE GLOBAL'),'Killer must not show ranking as global points');
const shanghaiV4=generator.visualReportFromHistory(shanghaiEntry);
assert.equal(shanghaiV4.players.length,2);
assert.equal(shanghaiV4.players[0].scoreDisplay,'90 PTS');
assert.ok(shanghaiV4.tickerSrc.includes('ticker_shanghai'));
const x01=generator.visualReportFromHistory({kind:'x01',summary:{mode:'x01',rankings:[{id:'n',name:'Ninja',rank:1,score:1}],
  perPlayer:[{id:'n',name:'Ninja',setsWon:1,legsWon:2}]}});
assert.equal(x01.matchType,'x01','X01 exclusive route must remain active');
console.log('OK — Capital: contrats + pénalités ; Killer: éliminations/vies ; Shanghai: cibles + historique ; X01 intact ; identité strictement isolée.');
// Challenge variants: only explicit configuration is printed, no made-up hits.
const challengeFull=compile('challengeFullReport',id=>{
 if(id==='./challengeExercises')return {challengeExerciseType:cfg=>cfg.exerciseType||'classic'};
 throw Error('unexpected Challenge import '+id);
});
const challengeResult=challengeFull.enrichChallengeReport(make([p('n','Ninja',80)]),{
 exerciseType:'sequence',target:'20',visits:3,sequenceObjectives:['20','D20','BULL'],
 sequenceScoreMode:'real',halfItStartScore:40,
},[],[]);
assert.ok(challengeResult.details.some(s=>s.title==='OBJECTIFS ENREGISTRÉS · SÉQUENCE'&&s.rows.length===3));
assert.ok(challengeResult.details.some(s=>s.title==='OPTIONS DE LA VARIANTE'&&s.rows.some(r=>r[0]==='SÉQUENCE · BARÈME'&&r[1]==='real')));
assert.ok(!challengeResult.details.some(s=>s.title.includes('PERFORMANCE PAR CIBLE')));
console.log('OK — Variantes Challenge : paramètres et objectifs conservés, performances absentes non fabriquées.');
