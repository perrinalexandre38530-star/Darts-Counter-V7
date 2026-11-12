// Tests isolated adapters without the browser/PDF canvas runtime.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); }
catch { ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript'); }
const file = new URL('../src/lib/historySportReport.ts', import.meta.url);
const content = readFileSync(file, 'utf8');
const compiled = ts.transpileModule(content, { fileName: file.pathname,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true });
assert.equal(compiled.diagnostics?.length, 0, 'TypeScript syntax errors');
const module = { exports: {} };
new Function('module', 'exports', compiled.outputText)(module, module.exports);
const { applyHistoricalSportResult } = module.exports;
const report = (players = []) => ({ title: 'PARTIE', rounds: 0, unit: 'tours', players,
  highlight: [], details: [{ title:'PARAMÈTRES DE LA PARTIE', columns:['CHAMP','VALEUR'],rows:[['FORMAT','DUEL']] }],
  date:'2026-11-12' });
const apply = (entry, mode) => applyHistoricalSportResult(report(), entry, mode);
const babyfoot = apply({kind:'babyfoot', payload: {sport:'babyfoot',teamA:'Bleus',teamB:'Ors',
  scoreA:10,scoreB:8,setsA:2,setsB:1,setsEnabled:true,winnerTeam:'A',
  teamAProfileIds:['p1'],players:[{id:'p1',avatarDataUrl:'data:image/png;base64,aaa'}]}},'1v1');
assert.equal(babyfoot.players.length,2);
assert.equal(babyfoot.players[0].scoreDisplay,'2 SETS · 10 BUTS');
assert.equal(babyfoot.players[1].scoreDisplay,'1 SET · 8 BUTS');
assert.equal(babyfoot.players[0].avatarUrl,'data:image/png;base64,aaa');
assert.ok(babyfoot.details.some(section=>section.title.includes('BABY-FOOT')));
assert.ok(babyfoot.details.some(section=>section.title==='PARAMÈTRES DE LA PARTIE'));
const lines=apply({kind:'babyfoot',summary:{scoreLine:'Bleus: 10 — Ors: 9',teamA:'Bleus',teamB:'Ors'}},'babyfoot');
assert.equal(lines.players[0].score,10);
const petanque=apply({kind:'petanque',payload:{sport:'petanque',scores:{A:13,B:8},
  teams:{A:{name:'Les Lions'},B:{name:'Les Loups'}},ends:[{teamId:'A',points:3},{teamId:'B',points:2}],targetScore:13}},'petanque');
assert.equal(petanque.players[0].name,'Les Lions');
assert.equal(apply({kind:'PÉTANQUE',payload:{scoreA:13,scoreB:8}},'classic').players.length,2);
assert.equal(petanque.highlight.find(v=>v.label==='MÈNES').value,'2');
assert.equal(petanque.details.at(-1).rows.length,2);
const pingpong=apply({kind:'pingpong',payload:{sport:'pingpong',sideA:'Ninja',sideB:'Alex',setsA:3,setsB:1,pointsA:7,pointsB:5}},'match_1v1');
assert.equal(pingpong.players[0].scoreDisplay,'3 SETS');
assert.ok(pingpong.details[0].rows.some(v=>v[0]==='POINTS DU SET'));
const legacy=apply({kind:'pingpong',players:[{id:'p1',name:'A'},{id:'p2',name:'B'}],winnerId:'p2',summary:{scores:{p1:9,p2:11},sets:[1,0]}},'pingpong');
assert.equal(legacy.players[0].name,'B');
assert.ok(!legacy.players[0].scoreDisplay.includes('SET'));
const molkky = apply({kind:'molkky',payload:{sport:'molkky',state:{
  players:[{id:'n',name:'Ninja',score:50,throws:9},{id:'a',name:'Alex',score:36,throws:12}],
  winnerPlayerId:'n',config:{targetScore:50},turns:[
    {playerId:'n',value:8,beforeScore:42,afterScore:50},
    {playerId:'a',value:0,beforeScore:36,afterScore:36},
  ]}}},'molkky');
assert.equal(molkky.players[0].scoreDisplay,'50 PTS');
assert.equal(apply({kind:'MÖLKKY',payload:{state:{players:[{id:'n',name:'Ninja',score:50}]}}},'classic').players.length,1);
assert.equal(molkky.highlight.find(v=>v.label==='OBJECTIF').value,'50 PTS');
assert.ok(molkky.details.some(section=>section.title.includes('HISTORIQUE DES LANCERS')));
const missingMolkky=apply({kind:'molkky',payload:{state:{players:[{id:'n',name:'Ninja'}]}}},'molkky');
assert.equal(missingMolkky.players.length,0);
const noScores=report([{name:'Ninja',score:5}]);
const copy=applyHistoricalSportResult(noScores,{kind:'petanque',payload:{sport:'petanque',teamA:'A',teamB:'B'}},'petanque');
assert.strictEqual(copy,noScores);
assert.equal(copy.players[0].score,5);
const dart=report([{name:'Ninja',score:5}]);
assert.strictEqual(applyHistoricalSportResult(dart,{kind:'x01'},'x01'),dart);
// Exercise the actual History->PDF view-model integration (no DOM needed).
const generatorFile = new URL('../src/lib/challengeResultsExport.ts', import.meta.url);
const generatorCompiled = ts.transpileModule(readFileSync(generatorFile, 'utf8'), {
  fileName: generatorFile.pathname, reportDiagnostics: true,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
assert.equal(generatorCompiled.diagnostics?.length, 0, 'Main export generator must parse');
const generator = { exports: {} };
const stubRequire = (id) => {
  if (id === './historySportReport') return module.exports;
  if (id === './challengeFullReport') return { enrichChallengeReport: v => v };
  if (id === 'fflate') return { zipSync: () => new Uint8Array([]) };
  if (id.endsWith('.png') || id.endsWith('.webp')) return {default:`/stub/${id.split('/').at(-1)}`};
  throw new Error('Unexpected import: ' + id);
};
new Function('require','module','exports',generatorCompiled.outputText)(stubRequire,generator,generator.exports);
const build = generator.exports.visualReportFromHistory;
const babyV4 = build({ kind:'babyfoot', sport:'babyfoot', summary:{scoreA:7,scoreB:10,teamA:'Bleus',teamB:'Rouges',winnerTeam:'B',setsA:1,setsB:2,setsEnabled:true},payload:{sport:'babyfoot'} });
assert.equal(babyV4.players[0].name,'Rouges');
assert.equal(babyV4.players[0].scoreDisplay,'2 SETS · 10 BUTS');
assert.ok(babyV4.tickerSrc.endsWith('ticker_babyfoot_match.png'));
const petanqueV4 = build({kind:'petanque', payload:{sport:'petanque',scoreA:13,scoreB:10,teams:{A:{name:'A'},B:{name:'B'}},ends:[{teamId:'A',points:2}]}});
assert.equal(petanqueV4.players.length,2);
assert.ok(petanqueV4.details.some(section=>section.title.includes('MÈNE PAR MÈNE')));
const molkkyV4 = build({kind:'molkky',payload:{sport:'molkky',state:{players:[{id:'u1',name:'A',score:36},{id:'u2',name:'B',score:50}],winnerPlayerId:'u2',config:{targetScore:50},turns:[]}}});
assert.equal(molkkyV4.players[0].name,'B');
assert.equal(molkkyV4.players[0].scoreDisplay,'50 PTS');
const dartsV4 = build({kind:'cricket',summary:{mode:'cricket',rankings:[{id:'1',name:'Ninja',score:12,mpr:2.8}]}});
assert.ok(!dartsV4.players.some(p=>p.scoreSecondary === 'Résultat de l’équipe'));
console.log('OK : Baby-foot, scoreLine, Pétanque, Ping-Pong récent/ancien, Mölkky, archives incomplètes, X01/Cricket préservés + intégration History V4.');
