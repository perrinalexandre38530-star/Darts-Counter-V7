import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const root = new URL('../', import.meta.url);
const read = (file) => readFileSync(new URL(file, root), 'utf8');
const appFiles = [
  'src/components/history/CapitalHistoryMatchDetail.tsx',
  'src/components/stats/CapitalStatsTabFull.tsx',
  'src/lib/capitalHistoryVisualReport.ts',
];
for (const file of appFiles) {
  const output = ts.transpileModule(read(file), {
    fileName: file, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  });
  const issues = output.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error) || [];
  assert.deepEqual(issues.map(e => ts.flattenDiagnosticMessageText(e.messageText, ' ')), [], `Syntaxe ${file}`);
}
const css = read('src/components/history/CapitalHistoryMatchDetail.css');
const modal = read('src/components/history/CapitalHistoryMatchDetail.tsx');
for (const token of ['mss-capital-history-modal', 'mss-capital-history-content', 'mss-capital-history-tabs', 'mss-capital-history-footer']) {
  assert.ok(css.includes(`.${token}`));
  assert.ok(modal.includes(`className="${token}"`));
}
assert.match(css, /orientation:\s*landscape/);
assert.match(css, /max-height:\s*540px/);
assert.match(css, /100dvh/);
assert.match(css, /safe-area-inset-bottom/);
assert.match(css, /challenge-report-actions button/);
assert.match(modal, /<CapitalContractMatrix/);
assert.match(modal, /<CapitalMatchRecap/);
assert.match(modal, /ChallengeReportActions compact busy=\{reportBusy\} onExport=\{onExport\}/);
const stats=read('src/components/stats/CapitalStatsTabFull.tsx');
assert.match(stats,/aria-label="Performance CAPITAL par contrat, tableau défilant"/);
assert.match(stats,/overflowX:\s*"auto"/);
assert.match(stats,/repeat\(auto-fit,minmax\(70px,1fr\)\)/);
assert.match(stats,/CONTRAT','RÉUSSITE','CRÉDITÉS','PERDUS','RECORD'/);
// Compile and run the pure source-of-truth report adapter with real V161 reader.
const convert = (file) => ts.transpileModule(read(file), { fileName:file,
  compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022} }).outputText;
const reader=convert('src/lib/capitalHistoryMatchDetail.ts');
const { readCapitalHistoryMatchDetail } = await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(reader));
globalThis.__capitalReaderV163 = readCapitalHistoryMatchDetail;
const converted=convert('src/lib/capitalHistoryVisualReport.ts')
  .replace(/^import\s+\{ readCapitalHistoryMatchDetail \}\s+from\s+['"][^'"]+['"];?\s*/m,
    'const readCapitalHistoryMatchDetail = globalThis.__capitalReaderV163;\n')
  .replace(/^import\s+\{ CAPITAL_CONTRACT_META \}\s+from\s+['"][^'"]+['"];?\s*/m,
    `const CAPITAL_CONTRACT_META = {capital:{label:'Capital initial'},n20:{label:'20'},triple_any:{label:'Triple'}};\n`);
assert.doesNotMatch(converted, /^import\s/m);
const { capitalHistoryVisualReport } = await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(converted));
const makePlayer=(id,name,rank)=>({id,name,rank,finalCapital:200-rank*20,startingCapital:50,pointsWon:120,capitalLost:30,successfulContracts:2,contractsPlayed:3,successRate:66.7,dartsThrown:9});
const players=Array.from({length:7}, (_,i)=>makePlayer(`id_${i}`,i===0||i===1?'NINJA':`TEST ${i+1}`,i+1));
const source={ kind:'capital',status:'finished',summary:{capitalVariant:{label:'LÉGENDES'},
  contracts:[{id:'capital',label:'Capital initial'},{id:'n20',label:'20'},{id:'triple_any',label:'Triple'}],players},
  payload:{stats:{visits:players.flatMap((p,i)=>[
    {playerId:p.id,contractIndex:0,contractId:'capital',scoreBefore:0,scoreAfter:50,success:true},
    {playerId:p.id,contractIndex:1,contractId:'n20',scoreBefore:50,scoreAfter:80+i,success:true},
    {playerId:p.id,contractIndex:2,contractId:'triple_any',scoreBefore:80+i,scoreAfter:90+i,success:true},
  ])}}
};
const result=capitalHistoryVisualReport({title:'',players:[],rounds:0,unit:'',highlight:[],date:'13/11/2026'},source);
const classify=result.details.filter(x=>x.title.startsWith('CAPITAL · CLASSEMENT')||x.title==='CAPITAL · PERFORMANCE');
assert.equal(classify.length,2);
assert.deepEqual(classify.map(x=>x.columns.length),[4,4], 'Pas de colonnes microscopiques sur A4');
assert.equal(classify[0].rows.length,7);
assert.equal(classify[1].rows.length,7);
assert.equal(classify[0].rows[0][0],classify[0].rows[1][0],'Homonymes présentés comme deux joueurs');
assert.notEqual(result.players[0].participantId,result.players[1].participantId,'IDs distincts conservés');
const tables=result.details.filter(x=>x.title.startsWith('CAPITAL · CONTRATS PAR JOUEUR'));
assert.equal(tables.length,3,'Sept joueurs: tables par groupes de trois');
assert.equal(tables[2].columns.at(-1),'TEST 7','Le 7e joueur est dans le PDF');
assert.ok(result.details.filter(x=>x.title.includes('ÉVOLUTION DU CAPITAL')).every(x=>x.columns.length===5),'Evolution A4 en cinq colonnes maximum');
assert.ok(result.details.every(x=>x.columns.length<=5),'Toutes les sections du rapport CAPITAL respectent la largeur A4');
assert.equal(result.title,'CAPITAL · LÉGENDES');
console.log('CAPITAL V163 OK — fiche portrait/paysage, tableaux StatsHub défilants, rapport A4 7 joueurs, homonymes et évolution.');
