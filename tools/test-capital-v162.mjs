import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const files = [
  'src/lib/capitalHistoryVisualReport.ts',
  'src/lib/historyDartsModeReport.ts',
  'src/components/history/CapitalHistoryMatchDetail.tsx',
  'src/pages/HistoryPage.tsx',
];
const compiled = new Map();
for (const file of files) {
  const result = ts.transpileModule(read(file), {
    fileName: file, reportDiagnostics: true,
    compilerOptions: {module:ts.ModuleKind.ESNext, target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},
  });
  const errors = result.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.deepEqual(errors.map(e => ts.flattenDiagnosticMessageText(e.messageText,' ')),[],`Syntaxe ${file}`);
  compiled.set(file,result.outputText);
}
const readerCode = ts.transpileModule(read('src/lib/capitalHistoryMatchDetail.ts'), {
  fileName:'src/lib/capitalHistoryMatchDetail.ts',
  compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022},
}).outputText;
const {readCapitalHistoryMatchDetail} = await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(readerCode));
globalThis.__capitalTestReader = readCapitalHistoryMatchDetail;
const helper = compiled.get(files[0])
  .replace(/^import\s+\{ readCapitalHistoryMatchDetail \}\s+from\s+['"][^'"]+['"];?\s*/m,
    'const readCapitalHistoryMatchDetail = globalThis.__capitalTestReader;\n')
  .replace(/^import\s+\{ CAPITAL_CONTRACT_META \}\s+from\s+['"][^'"]+['"];?\s*/m,
    `const CAPITAL_CONTRACT_META = {capital:{label:'Capital initial'},n20:{label:'20'},triple_any:{label:'Triple'}};\n`);
assert.doesNotMatch(helper,/^import\s/m);
const {capitalHistoryVisualReport} = await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(helper));
const visit=(playerId,contractIndex,contractId,scoreBefore,scoreAfter,success)=>({
  playerId,contractIndex,contractId,scoreBefore,scoreAfter,success,rawVisitScore:105,visitScore:scoreAfter-scoreBefore,
});
const player=(id,name,rank,finalCapital,successfulContracts)=>({
  id,name,rank,finalCapital,startingCapital:50,pointsWon:150,capitalLost:25,successfulContracts,contractsPlayed:3,successRate:66.7,averageVisit:50,bestVisit:100,dartsThrown:9,
});
const source={kind:'capital',status:'finished',summary:{
  capitalVariant:{label:'MIROIR'},contracts:[{id:'capital',label:'Capital initial'},{id:'n20',label:'20'},{id:'triple_any',label:'Triple'}],
  players:[player('a','TEST',1,160,3),player('b','TEST',2,30,1),player('c','TEST 3',3,25,1),player('d','TEST 4',4,20,1)]},
  payload:{stats:{visits:[
    visit('a',0,'capital',0,50,true),visit('a',1,'n20',50,100,true),
    visit('a',1,'n20',50,120,true), // overwritten visit, only latest snapshot
    visit('a',2,'triple_any',120,160,true),
    visit('b',0,'capital',0,50,true),visit('b',1,'n20',50,25,false),visit('b',2,'triple_any',25,30,true),
    visit('c',0,'capital',0,50,true),visit('c',1,'n20',50,25,false),
    visit('d',0,'capital',0,50,true),visit('d',1,'n20',50,25,false),
    visit('outsider',2,'triple_any',0,999,true),
  ]}},
};
const report={title:'',rounds:0,unit:'',highlight:[],players:[],date:'13/11/2026'};
const out=capitalHistoryVisualReport(report,source);
assert.equal(out.title,'CAPITAL · MIROIR');
assert.equal(out.rounds,3);
assert.equal(out.players.length,4);
assert.equal(out.players[0].name,out.players[1].name,'Homonymes non fusionnés');
assert.notEqual(out.players[0].participantId,out.players[1].participantId);
assert.deepEqual(out.players.map(p=>p.score),[160,30,25,20]);
const tables=out.details.filter(d=>d.title.startsWith('CAPITAL · CONTRATS PAR JOUEUR'));
assert.equal(tables.length,2,'Largeur PDF : 3 joueurs max par tableau');
assert.equal(tables[1].columns.at(-1),'TEST 4','Le quatrième joueur reste affiché');
assert.equal(tables[0].rows[1][2],'120 · OK','Dernière volée retenue');
assert.equal(tables[0].rows[2][4],'—','Aucun zéro inventé pour une volée absente');
assert.equal(tables[1].rows[1][2],'25 · ÉCHEC');
assert.equal(out.details.filter(d=>d.title.startsWith('TEST · ÉVOLUTION DU CAPITAL')).length,2);
assert.ok(out.details.some(d=>d.title.includes('INTÉGRITÉ')),'Journal incomplet signalé');
const noVisits = capitalHistoryVisualReport({title:'',rounds:0,unit:'',highlight:[],players:[],date:''},{...source,payload:{}});
assert.equal(noVisits.details.filter(d=>d.title.startsWith('CAPITAL · CONTRATS PAR JOUEUR'))[0].rows[1][2],'—');
const ui=read('src/components/history/CapitalHistoryMatchDetail.tsx');
const history=read('src/pages/HistoryPage.tsx');
const adapter=read('src/lib/historyDartsModeReport.ts');
assert.match(ui,/ChallengeReportActions compact busy=\{reportBusy\} onExport=\{onExport\}/);
assert.match(history,/onExport=\{\(format\) => \{/);
assert.match(history,/handleHistoryCardReport\(entry, format\)/);
assert.match(history,/const loaded = \(wantedId/);
assert.match(adapter,/capitalHistoryVisualReport\(capitalReport\(report,entry,payload,summary\),entry\)/);
assert.match(history,/historyReportError \|\| historyReportInfo/);
console.log('CAPITAL V162 OK — fiche Historique > rapports PDF/PNG/partage, matrice 4 joueurs, homonymes, dernières volées, lacunes non inventées.');
