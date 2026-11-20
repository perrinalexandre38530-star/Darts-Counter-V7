/** Regression de la variante MARIACHI depuis V7(230).
 * Usage : npm run test:mexicain:mariachi (typescript devDependency)
 * Aucun navigateur, aucun appel réseau et aucune mutation de l'Historique V4.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
Module._extensions['.ts'] = (mod, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  }}).outputText;
  mod._compile(output, filename);
};
const { mariachiContract, mariachiAccepts, mariachiLegalDarts, mexicainScoreDarts,
  mariachiBoardColor } = require('../src/lib/gameEngines/mexicainMariachi.ts');
const { createWave61State, playWave61Visit, cloneWave61State, getMexicainContract,
  pickWave61BotDarts } = require('../src/lib/gameEngines/wave61Engine.ts');
const d = (n,bed='S') => ({number:n,bed});
const miss = () => ({bed:'MISS'});
const p = [{id:'a',name:'Alpha'},{id:'b',name:'Bravo'},{id:'bot',name:'Bot'}];
const manualOptions = {
  mariachiEnabled:'yes', mariachiMode:'multisectors', mariachiPick:'manual',
  mariachiNumbers:[5,10,20], mariachiRotation:'fixed', mariachiBeds:'all',
  mexicainBonus:'yes', targetMode:'fixed', fixedTarget:7, progressive:'classic',
};
function start(options=manualOptions, participants=p.slice(0,2), rounds=20){
  return createWave61State(participants,'mexicain',{
    selectedIds:participants.map(x=>x.id), players:participants.length,
    playersList:participants, randomOrder:false, rounds, modeOptions:{...options},
  });
}
const fixed = mariachiContract(manualOptions,'mariachi-regression',0);
assert.deepEqual(fixed.sectors,[5,10,20]);
assert.equal(mariachiAccepts(d(20,'T'),fixed),true);
assert.equal(mariachiAccepts(d(19,'T'),fixed),false);
assert.equal(mariachiLegalDarts(fixed).length,9);
const tortilla=mexicainScoreDarts([d(20,'D'),d(20,'T'),miss()],7,fixed,true);
assert.deepEqual([tortilla.base,tortilla.bonus,tortilla.total,tortilla.bonusName],[100,20,120,'TORTILLA']);
const enchiladas=mexicainScoreDarts([d(20),d(20,'D'),d(20,'T')],7,fixed,true);
assert.deepEqual([enchiladas.base,enchiladas.bonus,enchiladas.total,enchiladas.bonusName],[120,80,200,'ENCHILADAS']);
assert.equal(mexicainScoreDarts([d(20),d(20,'D'),d(20,'T')],7,fixed,false).total,120,
  'bonus optional even for a completed Shanghai');
assert.equal(mexicainScoreDarts([d(19,'T'),d(20,'D'),d(20,'T')],7,fixed,true).total,120,
  'a dart out of contract scores zero and does not block the remaining valid bonus');
assert.equal(mexicainScoreDarts([d(20,'D'),d(10,'T'),miss()],7,fixed,true).bonus,0,
  'TORTILLA requires D/T on the same sector');

// Dartboard color is physical, unrelated to MSS keypad tones.
assert.equal(mariachiBoardColor(d(20)), 'BLACK');
assert.equal(mariachiBoardColor(d(1)), 'WHITE');
assert.equal(mariachiBoardColor(d(20,'T')), 'RED');
assert.equal(mariachiBoardColor(d(1,'D')), 'GREEN');
assert.equal(mariachiBoardColor({bed:'OB'}), 'GREEN');
assert.equal(mariachiBoardColor({bed:'IB'}), 'RED');
const colorBase = {mariachiEnabled:'yes',mariachiMode:'colors',mariachiColors:'RED',
  mariachiBeds:'triple',bullEnabled:'yes'};
const redTriples = mariachiContract(colorBase,'mariachi',0);
assert.equal(mariachiAccepts(d(20,'T'),redTriples),true);
assert.equal(mariachiAccepts(d(20,'D'),redTriples),false);
assert.equal(mariachiAccepts({bed:'IB'},redTriples),false,
  'BULL50 is a DOUBLE, never an accepted TRIPLE even when it is red');
assert.equal(mariachiAccepts({bed:'OB'},redTriples),false);
const redDoubles=mariachiContract({...colorBase,mariachiBeds:'double'},'mariachi',0);
assert.equal(mariachiAccepts({bed:'IB'},redDoubles),true,'red BULL50 is a valid double');
assert.equal(mariachiAccepts({bed:'OB'},redDoubles),false);
const redSingles=mariachiContract({...colorBase,mariachiBeds:'single'},'mariachi',0);
assert.equal(mariachiAccepts({bed:'IB'},redSingles),false);
const greenSingles=mariachiContract({...colorBase,mariachiBeds:'single',mariachiColors:'GREEN'},'mariachi',0);
assert.equal(mariachiAccepts({bed:'OB'},greenSingles),true,'green BULL25 is a valid simple');
assert.equal(mariachiAccepts({bed:'IB'},greenSingles),false);
const excludedBull=mariachiContract({...colorBase,mariachiBeds:'double',bullEnabled:'no'},'mariachi',0);
assert.equal(mariachiAccepts({bed:'IB'},excludedBull),false);

const custom=mariachiContract({...manualOptions,mariachiMode:'custom',mariachiParity:'even',
  mariachiColors:'RED',mariachiBeds:'dt'},'mariachi',0);
assert.equal(mariachiAccepts(d(20,'D'),custom),true);
assert.equal(mariachiAccepts(d(10,'D'),custom),true,'even sector on a red double is valid');
assert.equal(mariachiAccepts(d(10,'S'),custom),false,'bed constraint also enforced');
assert.equal(mariachiAccepts(d(5,'T'),custom),false,'odd sector excluded');
const parity=mariachiContract({...manualOptions,mariachiMode:'parity',mariachiParity:'odd'},'mariachi',0);
assert.equal(mariachiAccepts(d(19,'S'),parity),true);
assert.equal(mariachiAccepts(d(20,'T'),parity),false);
const fiestaOptions={...manualOptions,mariachiMode:'fiesta',mariachiPick:'random',
  mariachiColors:'RED,GREEN',mariachiBeds:'all'};
const cycle=Array.from({length:5},(_,i)=>mariachiContract(fiestaOptions,'seed-fiesta',i));
assert.deepEqual(new Set(cycle.map(c=>c.kind)),new Set(['multisectors','doubles','triples','colors','parity']));
for (const c of cycle) assert(mariachiLegalDarts(c).length>0,'every fiesta round must be playable');
assert.deepEqual(mariachiContract(fiestaOptions,'seed-fiesta',3),cycle[3],
  'contracts must survive serialization/replay with deterministic seed');

// Points credited in history and the best-visit KPI must match the visible
// contract total; physical raw points remain separately in rawPoints.
let s=start();
assert.deepEqual(getMexicainContract(s),getMexicainContract(cloneWave61State(JSON.parse(JSON.stringify(s)))));
s=playWave61Visit(s,[d(20),d(20,'D'),d(20,'T')]);
assert.equal(s.scores.a,200);
assert.equal(s.special.mexicainRoundScores.a,200);
assert.equal(s.visits[0].visitScore,200,'visit history must include ENCHILADAS');
assert.equal(s.statsByPlayer.a.bestVisit,200,'best visit must use awarded points');
assert.equal(s.statsByPlayer.a.rawPoints,120,'physical raw score remains available');
let resumed=cloneWave61State(JSON.parse(JSON.stringify(s)));
resumed=playWave61Visit(resumed,[miss(),miss(),miss()]);
assert.equal(resumed.roundIndex,1);
assert.equal(resumed.special.mexicainHistory[0].bonuses.a.name,'ENCHILADAS');
assert.equal(resumed.special.mexicainHistory[0].scores.find(x=>x.id==='a').score,200);
assert.deepEqual(resumed.special.mexicainHistory[0].losers,['b']);

let noBonus=start({...manualOptions,mexicainBonus:'no'});
noBonus=playWave61Visit(noBonus,[d(20),d(20,'D'),d(20,'T')]);
assert.equal(noBonus.visits[0].visitScore,120);
assert.equal(noBonus.special.mexicainRoundBonuses.a.points,0);
let outOfContract=start({...manualOptions,mariachiMode:'doubles'});
outOfContract=playWave61Visit(outOfContract,[d(20),d(20,'T'),d(19,'T')]);
assert.equal(outOfContract.visits[0].visitScore,0,'unallowed physical hits never inflate History');
assert.equal(outOfContract.statsByPlayer.a.bestVisit,0);
assert.equal(outOfContract.statsByPlayer.a.rawPoints,137,'raw physical points kept distinct');

// Bot -> human, perfect tie, and partial-last ties in MARIACHI.
const players=[{id:'bot',name:'Bot'}, {id:'a',name:'Alpha'}, {id:'b',name:'Bravo'}];
let bots=start(manualOptions,players,20);
assert.equal(bots.players[bots.activePlayerIndex].id,'bot');
const botDarts=pickWave61BotDarts(bots,'normal',3);
assert.equal(botDarts.length,3);
bots=playWave61Visit(bots,botDarts);
assert.equal(bots.players[bots.activePlayerIndex].id,'a');
bots=playWave61Visit(bots,[miss(),miss(),miss()]);
bots=playWave61Visit(bots,[miss(),miss(),miss()]);
assert.equal(bots.roundIndex,1,'bot turns cannot block a human validation');
assert.equal(bots.special.mexicainHistory.length,1);
assert.equal(bots.special.mexicainHistory[0].losers.length === 0 || bots.special.mexicainHistory[0].losers.length === 2, true);
let equal=start();
equal=playWave61Visit(equal,[miss(),miss(),miss()]);
equal=playWave61Visit(equal,[miss(),miss(),miss()]);
assert.deepEqual(equal.special.mexicainHistory[0].losers,[]);
assert.deepEqual([equal.lives.a,equal.lives.b],[3,3]);

// Export must describe the contract, not a misleading single numeric target;
// each bonus is visible but already included in the validated score.
const exportSrc=fs.readFileSync(path.join(__dirname,'../src/lib/challengeResultsExport.ts'),'utf8');
assert.match(exportSrc,/OBJECTIFS PAR MANCHE/);
assert.match(exportSrc,/round\.contractLabel \|\|/);
assert.match(exportSrc,/SCORES ET BONUS PAR MANCHE/);
assert.match(exportSrc,/BONUS INCLUS/);
for (const relative of ['src/lib/gameEngines/mexicainMariachi.ts',
  'src/lib/gameEngines/wave61Engine.ts','src/lib/challengeResultsExport.ts']) {
  const file=path.join(__dirname,'..',relative);
  const result=ts.transpileModule(fs.readFileSync(file,'utf8'),{
    fileName:file,reportDiagnostics:true,
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},
  });
  assert.equal((result.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,relative);
}

// V236 non-browser regression guards: landscape keypad must remain scrollable,
// the submit row pinned, portrait targets large enough, and FIESTA changes
// start with a valid multiplier while off-contract shots remain selectable.
const playSrc=fs.readFileSync(path.join(__dirname,'../src/pages/Wave61SharedPlay.tsx'),'utf8');
const cssSrc=fs.readFileSync(path.join(__dirname,'../src/pages/wave61/MexicainFiesta.css'),'utf8');
assert.match(playSrc,/overflowY: spec\.id === "mexicain" \? "auto" : "hidden"/);
assert.match(playSrc,/data-mexicain-actions="1"/);
assert.match(playSrc,/const contractKey =/);
assert.match(playSrc,/setSelectedMultiplier\(preferred\)/);
assert.match(cssSrc,/\.mex-fiesta-play\[data-wave61-landscape="three-zone"\] \.mex-mariachi-actions\s*\{[^}]*position:sticky;/);
assert.match(cssSrc,/\.mex-fiesta-portrait \.mex-mariachi-actions > button \{[^}]*min-height:44px!important;/);
for(const file of ['src/pages/Wave61SharedPlay.tsx']){
 const filePath=path.join(__dirname,'..',file);
 const result=ts.transpileModule(fs.readFileSync(filePath,'utf8'),{
  fileName:filePath,reportDiagnostics:true,
  compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},
 });
 assert.equal((result.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,file);
}


// Exercise the real History V4 -> export view-model (without browser canvas).
// Unlike a regex alone, this checks the MARIACHI contract, score, bonus and
// remaining lives actually returned to the multipage PDF/PNG renderer.
const vm = require('node:vm');
const reportModule = {exports:{}};
const reportCompiled = ts.transpileModule(exportSrc, {compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,
}}).outputText;
vm.runInNewContext(reportCompiled,{
 exports:reportModule.exports,console,
 require(spec){
  if(spec.includes('challengeFullReport'))return{enrichChallengeReport:report=>report};
  if(spec.includes('historyDartsModeReport'))return{enrichHistoricalDartsModeReport:report=>report};
  if(spec.includes('historySportReport'))return{applyHistoricalSportResult:report=>report};
  if(spec.includes('shoveAPennyHistoryReport'))return{enrichShoveHistoryReport:report=>report};
  if(spec==='fflate')return{zipSync:()=>new Uint8Array([])};
  if(spec.endsWith('.png')||spec.endsWith('.webp'))return spec;
  throw Error('Unexpected export import: '+spec);
 }
});
const exampleReport=reportModule.exports.visualReportFromHistory({
 kind:'darts',game:{mode:'mexicain'},players:[{id:'a',name:'Alpha'},{id:'b',name:'Bravo'}],
 summary:{mode:'mexicain',rankings:[{id:'a',name:'Alpha',score:320,rank:1},{id:'b',name:'Bravo',score:0,rank:2}],
  mexicain:{rounds:[
   {round:1,target:20,contractLabel:'MULTISECTEURS · 5 · 10 · 20',scores:[{id:'a',score:200},{id:'b',score:0}],bonuses:{a:{name:'ENCHILADAS',points:80}},losers:['b'],lifeLoss:1},
   {round:2,target:8,contractLabel:'DOUBLES / TRIPLES · 8',scores:[{id:'a',score:120},{id:'b',score:0}],bonuses:{a:{name:'TORTILLA',points:20}},losers:['b'],lifeLoss:1},
  ],finalLives:{a:3,b:1}}}
});
assert.equal(exampleReport.title,'LE MEXICAIN · MARIACHI');
assert.equal(exampleReport.unit,'manches');
assert.equal(exampleReport.rounds,2);
const contractSection=exampleReport.details.find(s=>s.title==='OBJECTIFS PAR MANCHE');
const scoresSection=exampleReport.details.find(s=>s.title==='SCORES ET BONUS PAR MANCHE');
const livesSection=exampleReport.details.find(s=>s.title==='VIES RESTANTES');
assert.equal(contractSection.rows[1][1],'DOUBLES / TRIPLES · 8');
assert.equal(scoresSection.rows[0][2],'200','export must never add the bonus twice');
assert.equal(scoresSection.rows[0][3],'ENCHILADAS +80');
assert.equal(scoresSection.rows[2][3],'TORTILLA +20');
assert.equal(scoresSection.rows[1][4],'1');
assert.equal(livesSection.rows.find(row=>row[0]==='Bravo')[1],'1');

// V245: five real FIESTA rounds, equal scores and deterministic contract history.
// This exercises the engine loop rather than merely checking a text marker.
let fullFiesta = start({...fiestaOptions,mexicainBonus:'yes'},p,5);
const contractLabels=[];
for(let r=0;r<5;r++){
  const expected=getMexicainContract(fullFiesta);
  assert(expected?.label && mariachiLegalDarts(expected).length>0,'each FIESTA round has a playable contract');
  contractLabels.push(expected.label);
  for(let turn=0;turn<p.length;turn++) fullFiesta=playWave61Visit(fullFiesta,[miss(),miss(),miss()]);
  const historyRow=fullFiesta.special.mexicainHistory[r];
  assert.equal(historyRow.contractLabel,expected.label,'contract recorded for the correct round');
  assert.deepEqual(historyRow.losers,[],'general equality cannot cost a life');
  assert.equal(historyRow.scores.length,3,'all players completed the same contract');
  assert.deepEqual([fullFiesta.lives.a,fullFiesta.lives.b,fullFiesta.lives.bot],[3,3,3]);
}
assert.equal(new Set(contractLabels).size,5,'FIESTA rotates through five distinct contracts');
assert.equal(fullFiesta.phase,'finished','five-round cap ends normally without casualties');
const savedFiesta=cloneWave61State(JSON.parse(JSON.stringify(fullFiesta)));
assert.deepEqual(savedFiesta.special.mexicainHistory.map(x=>x.contractLabel),contractLabels,
  'the complete FIESTA contract timeline survives serialization');

// Screens must never label a MARIACHI contract as an unrelated random CIBLE.
const configSrc=fs.readFileSync(path.join(__dirname,'../src/pages/Wave61SharedConfig.tsx'),'utf8');
const endSrc=fs.readFileSync(path.join(__dirname,'../src/pages/wave61/MexicainFinalSummary.tsx'),'utf8');
assert.match(playSrc,/entry\.contractLabel \|\|/,'history overlay uses the saved contract label');
assert.match(playSrc,/inclus dans le score/,'floating history identifies already credited bonuses');
assert.match(configSrc,/FIESTA · EXEMPLE DES 5 FAMILLES/,'config previews the FIESTA rotation');
assert.match(endSrc,/inclus dans chaque total/,'end recap distinguishes bonus from additional points');
for(const file of ['src/pages/Wave61SharedConfig.tsx','src/pages/wave61/MexicainFinalSummary.tsx']){
  const filename=path.join(__dirname,'..',file);
  const transpile=ts.transpileModule(fs.readFileSync(filename,'utf8'),{fileName:filename,
    reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
  assert.deepEqual((transpile.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error),[],file);
}

console.log('✅ MARIACHI V245 : FIESTA 5 manches, égalité totale, historique, règles et écran final.');
