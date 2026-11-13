import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const read = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const compile = (path) => {
  const result = ts.transpileModule(read(path), {
    fileName: path, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  });
  assert.deepEqual(result.diagnostics?.filter(x => x.category === ts.DiagnosticCategory.Error)
    .map(x => ts.flattenDiagnosticMessageText(x.messageText, ' ')), [], `Syntaxe ${path}`);
  return result.outputText;
};
const engine = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(compile('src/lib/capitalGame.ts')));
const reader = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(compile('src/lib/capitalHistoryMatchDetail.ts')));
globalThis.__capitalReaderV164 = reader.readCapitalHistoryMatchDetail;
const reportSource = compile('src/lib/capitalHistoryVisualReport.ts')
  .replace(/^import\s+\{ readCapitalHistoryMatchDetail \}\s+from\s+['"][^'"]+['"];?\s*/m,
    'const readCapitalHistoryMatchDetail = globalThis.__capitalReaderV164;\n')
  .replace(/^import\s+\{ CAPITAL_CONTRACT_META \}\s+from\s+['"][^'"]+['"];?\s*/m,
    `const CAPITAL_CONTRACT_META = ${JSON.stringify(engine.CAPITAL_CONTRACT_META)};\n`);
assert.doesNotMatch(reportSource, /^import\s/m, 'Rapport autonome de test : imports résolus');
const {capitalHistoryVisualReport} = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(reportSource));

const contracts = ['capital', 'n20', 'triple_any', 'center'];
const ids = ['pA', 'pB', 'pC', 'pD'];
const names = ['NINJA', 'NINJA', 'TEST 3', 'TEST 4'];
const visits = [], detailed = [];
for (let p = 0; p < 4; p++) {
  let capital = 0;
  for (let round = 0; round < contracts.length; round++) {
    const darts = round === 0 ? [{v:20,mult:1},{v:1,mult:1},{v:1,mult:1}] :
      round === 1 ? [{v:20,mult:1},{v:5,mult:3},{v:20,mult:2}] :
      round === 2 ? [{v:19,mult:3},{v:20,mult:1},{v:10,mult:2}] :
                     [{v:25,mult:1},{v:9,mult:2},{v:3,mult:1}];
    const calculation = engine.applyCapitalVisit(capital, contracts[round], darts);
    assert.ok(calculation.success);
    if (round === 1) assert.deepEqual([calculation.rawVisitScore, calculation.visitScore], [75, 60], 'Seuls les impacts dans le 20 sont crédités');
    if (round === 2) assert.deepEqual([calculation.rawVisitScore, calculation.visitScore], [97, 57], 'Un autre simple et un double ne sont pas crédités au contrat TRIPLE');
    visits.push({
      id: `${ids[p]}-${round}`, playerId: ids[p], playerName: names[p],
      contractId: contracts[round], contractIndex: round, scoreBefore: capital,
      scoreAfter: calculation.scoreAfter, visitScore: calculation.visitScore,
      rawVisitScore: calculation.rawVisitScore, success: calculation.success,
      delta: calculation.delta, darts,
    });
    capital = calculation.scoreAfter;
  }
  detailed.push({id: ids[p], name: names[p], rank: p+1, finalCapital: capital,
    startingCapital: 22, pointsWon: capital-22, capitalLost: 0,
    successfulContracts: 3, contractsPlayed: 3, successRate: 100,
    averageVisit: 61.33, bestVisit: 97, dartsThrown: 12});
}
const lightPlayers = detailed.map(p => ({id:p.id, name:p.name, rank:p.rank, finalCapital:p.finalCapital}));
const badVisit = {playerId:'pA',contractIndex:2,contractId:'n20',success:true,scoreBefore:1,scoreAfter:888};
const partial = [visits[0], visits[4], badVisit, badVisit, badVisit, badVisit];
const saved = {
  id:'capital-test-v164',kind:'capital',mode:'capital',status:'finished',
  summary:{capitalVariant:{id:'clubs15',label:'OFFICIEL'},
    contracts:contracts.map(id=>({id,label:engine.CAPITAL_CONTRACT_META[id].label})),
    players:lightPlayers},
  payload:{stats:{players:detailed,visits:partial},
    visits, visitHistory:visits, config:{gridVariant:'clubs15'}},
};
const selected = reader.selectCapitalHistoryJournal(contracts, partial, visits);
assert.equal(selected, visits, 'Une synthèse partielle et polluée ne masque pas le journal complet');
const detail = reader.readCapitalHistoryMatchDetail(saved);
assert.equal(detail.journalComplete,true,'Les 16 volées réelles sont disponibles');
assert.equal(detail.visits.length,16);
assert.deepEqual(detail.players.map(p => p.id),ids,'NINJA homonymes distincts ; TEST 4 bien présent');
assert.equal(detail.players[0].pointsWon,detailed[0].pointsWon,'Points gagnés complétés par ID depuis stats détaillées');
assert.equal(detail.players[3].dartsThrown,12,'Fléchettes détaillées récupérées pour TEST 4');
assert.equal(detail.players[0].rank,1,'Classement du résumé conservé');
assert.equal(detail.players[0].finalCapital,detailed[0].finalCapital,'Capital final sauvegardé conservé');
assert.equal(detail.visits.find(v=>v.playerId==='pA' && v.contractIndex===1).visitScore,60);
const mutated = reader.readCapitalHistoryMatchDetail({...saved,summary:{...saved.summary,players:[{...lightPlayers[0],finalCapital:999},...lightPlayers.slice(1)]}});
assert.ok(mutated.integrityWarning && /ne correspond pas/.test(mutated.dataWarning),'Alerte d’incohérence sans recalcul silencieux');
assert.equal(mutated.players[0].finalCapital,999);
const historyEntryBefore = JSON.stringify(saved);
const report = capitalHistoryVisualReport({title:'',players:[],rounds:0,unit:'',highlight:[],date:''},saved);
assert.equal(JSON.stringify(saved),historyEntryBefore,'La lecture ne modifie pas la sauvegarde V4');
assert.equal(report.title,'CAPITAL · OFFICIEL');
assert.equal(report.players.length,4);
assert.deepEqual(report.players.map(p=>p.participantId), ids);
assert.equal(report.players[0].metrics.find(m=>m.label==='POINTS CRÉDITÉS')?.value,String(detailed[0].pointsWon));
const matrix = report.details.filter(section=>section.title.startsWith('CAPITAL · CONTRATS PAR JOUEUR'));
assert.equal(matrix.length,2,'Tableau A4 scindé par groupes de trois joueurs');
assert.equal(matrix[1].columns.at(-1),'TEST 4','Dernier joueur bien visible dans le rapport');
assert.match(matrix[0].rows[1][2],/82 · OK/,'Capital après le 20 correct dans le rapport');
assert.equal(report.details.some(section=>section.title.includes('INTÉGRITÉ')),false,'Aucun faux diagnostic');

for(const path of ['src/components/history/CapitalHistoryMatchDetail.tsx',
                    'src/components/stats/CapitalContractMatrix.tsx',
                    'src/pages/HistoryPage.tsx']) compile(path);
const history = read('src/pages/HistoryPage.tsx');
assert.match(history, /setCapitalHistoryDetail\(e\)/,'Ouverture fiche CAPITAL depuis Voir stats');
assert.match(history, /handleHistoryCardReport\(entry, format\)/,'Exports PDF, PNG et partage depuis la fiche');
assert.match(history, /hydrateSavedEntry\(entry\)/,'Chargement de l’enregistrement complet avant export');
console.log('CAPITAL V164 OK — score S/D/T, journal complet contre synthèse partielle, homonymes, TEST 4, classement/statistiques par ID, PDF multi-joueurs, aucune mutation.');
