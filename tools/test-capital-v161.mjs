import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const read = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const files = [
  'src/lib/capitalHistoryMatchDetail.ts',
  'src/components/history/CapitalHistoryMatchDetail.tsx',
  'src/components/stats/CapitalContractMatrix.tsx',
  'src/components/stats/CapitalMatchRecap.tsx',
];
let moduleText = '';
for (const file of files) {
  const result = ts.transpileModule(read(file), {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  assert.equal(result.diagnostics.filter((x) => x.category === ts.DiagnosticCategory.Error).map((d) => ts.flattenDiagnosticMessageText(d.messageText," ")).join("; "), "", `Syntaxe ${file}`);
  if (file === files[0]) moduleText = result.outputText.replace(/import\s+.*?from\s+['"]\.\/capitalGame['"];?\s*/g, '');
}
const {readCapitalHistoryMatchDetail} = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(moduleText));
const base = {
 id:'one', kind:'capital', mode:'capital', status:'finished',
 summary:{capitalVariant:{label:'MIROIR'},contracts:[{id:'capital',label:'Capital initial'},{id:'n20',label:'20'},{id:'triple_any',label:'Triple'}],
 players:[
 {id:'a',name:'TEST',rank:1,startingCapital:60,finalCapital:160,pointsWon:100,capitalLost:0,successRate:100,contractsPlayed:2,successfulContracts:2,dartsThrown:9},
 {id:'b',name:'TEST',rank:2,startingCapital:60,finalCapital:30,pointsWon:30,capitalLost:60,successRate:50,contractsPlayed:2,successfulContracts:1,dartsThrown:9}],
 capitalIntegrity:{verified:true}},
 payload:{stats:{visits:[
  {playerId:'a',contractIndex:0,contractId:'capital',scoreBefore:0,scoreAfter:60,success:true,visitScore:60},
  {playerId:'b',contractIndex:0,contractId:'capital',scoreBefore:0,scoreAfter:60,success:true,visitScore:60},
  {playerId:'a',contractIndex:1,contractId:'n20',scoreBefore:60,scoreAfter:100,success:true,visitScore:40,rawVisitScore:65},
  {playerId:'a',contractIndex:1,contractId:'n20',scoreBefore:60,scoreAfter:120,success:true,visitScore:60,rawVisitScore:60},
  {playerId:'b',contractIndex:1,contractId:'n20',scoreBefore:60,scoreAfter:30,success:false,visitScore:0,rawVisitScore:80,penaltyLost:30},
  {playerId:'a',contractIndex:2,contractId:'triple_any',scoreBefore:120,scoreAfter:160,success:true,visitScore:40},
  {playerId:'b',contractIndex:2,contractId:'triple_any',scoreBefore:30,scoreAfter:30,success:true,visitScore:0},
 ]}}
};
const full=readCapitalHistoryMatchDetail(base);
assert.equal(full.variantName,'MIROIR');
assert.deepEqual(full.players.map(p => p.id), ['a','b'],'Deux homonymes distincts');
assert.equal(full.players[0].pointsWon,100,'Points crédités conservés depuis sauvegarde');
assert.equal(full.visits.length,6,'Reprise même manche conservée une seule fois');
assert.equal(full.visits.find(v=>v.playerId==='a'&&v.contractIndex===1).scoreAfter,120);
assert.equal(full.journalComplete,true);
assert.equal(full.dataWarning,null);
const partial=readCapitalHistoryMatchDetail({...base, payload:{stats:{visits:base.payload.stats.visits.filter(v=>!(v.playerId==='b'&&v.contractIndex===2))}}});
assert.equal(partial.journalComplete,false);
assert.match(partial.dataWarning,/partiel/);
assert.equal(partial.visits.some(v=>v.playerId==='b'&&v.contractIndex===2), false);
const empty=readCapitalHistoryMatchDetail({...base, payload:{}, summary:{...base.summary,players:[{id:'a',name:'TEST',finalCapital:160}],visits:[]}});
assert.equal(empty.visits.length,0);
assert.match(empty.dataWarning,/indisponible/);
assert.equal(empty.players[0].finalCapital,160);
const bad=readCapitalHistoryMatchDetail({...base,summary:{...base.summary,capitalIntegrity:{verified:false}}});
assert.equal(bad.integrityWarning,true);
const mismatch=readCapitalHistoryMatchDetail({...base,summary:{...base.summary,players:[{...base.summary.players[0],finalCapital:999},base.summary.players[1]]}});
assert.equal(mismatch.integrityWarning,true);
assert.match(mismatch.dataWarning,/ne correspond pas/);
const misattributed=readCapitalHistoryMatchDetail({...base,payload:{stats:{visits:[...base.payload.stats.visits,{playerId:'outsider',contractIndex:1,contractId:'n20',scoreAfter:999,scoreBefore:0,success:true},{playerId:'a',contractIndex:2,contractId:'n19',scoreAfter:999,scoreBefore:0,success:true}]}}});
assert.equal(misattributed.visits.length,6,'Aucun impact inconnu ni contrat non correspondant');
const page=read('src/pages/HistoryPage.tsx');
assert.match(page,/setCapitalHistoryDetail\(e\)/);
assert.match(page,/statusOf\(e\) !== "in_progress"/);
assert.match(page,/<CapitalHistoryMatchDetail record=\{capitalHistoryDetail\}/);
const ui=read('src/components/history/CapitalHistoryMatchDetail.tsx');
for(const word of ['CLASSEMENT','CONTRATS','ÉVOLUTION','DUEL · COMPARATIF','CapitalContractMatrix','CapitalMatchRecap']) assert.ok(ui.includes(word),`UI ${word}`);
assert.match(ui,/createPortal\(/);
console.log('CAPITAL V161 : parties terminées, identités, journal source, reprises, contrats, fiche 3 onglets et compatibilité historique OK.');
