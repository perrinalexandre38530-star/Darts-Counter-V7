import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const files = ['src/lib/capitalPersonalRecords.ts','src/components/stats/CapitalStatsTabFull.tsx'];
let code;
for (const file of files) {
  const transpile = ts.transpileModule(read(file), {fileName:file,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}});
  assert.deepEqual(transpile.diagnostics.filter(x=>x.category===ts.DiagnosticCategory.Error), [], `Syntaxe ${file}`);
  if (file.endsWith('capitalPersonalRecords.ts')) code=transpile.outputText;
}
const {buildCapitalPersonalRecords} = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(code));
const visit=(index, contractId, success, raw, credited, before, after, playerId='ninja')=>({contractIndex:index, contractId, success, rawVisitScore:raw, visitScore:credited,scoreBefore:before,scoreAfter:after,playerId});
const match=(id,variantId,variantLabel,visits,more={})=>({
  variantId,variantLabel,record:{id,kind:'capital',status:'finished',updatedAt:12345,summary:{finishedAt:12345,...more},payload:{stats:{visits},summary:{visits}}},
  row:{id:'ninja',profileId:'ninja',name:'Ninja'}
});
const a=match('a','clubs15','OFFICIEL',[
  visit(0,'capital',true,60,60,0,60),
  visit(1,'n20',true,105,100,60,160), // T20 + S5 + D20: pas 105 gagnés !
  visit(2,'triple_any',true,45,45,160,205),
  visit(3,'n19',false,30,0,205,102),
  visit(4,'double_any',true,40,40,102,142),
  visit(4,'double_any',true,50,50,102,152), // reprise même manche: compter UNE seule fois
  visit(5,'n18',true,18,18,152,170,'autreProfil'),
]);
const b=match('b','beginner','STANDARD',[
  visit(0,'capital',true,100,100,0,100),
  visit(1,'n20',true,120,60,100,160),
  visit(2,'double_any',false,120,0,160,80),
  visit(3,'n19',true,57,57,80,137),
]);
const invalid=match('c','clubs15','OFFICIEL',[visit(1,'n20',true,180,180,0,180)],{capitalIntegrity:{verified:false}});
const noDetail=match('d','clubs15','OFFICIEL',[]);
const all=buildCapitalPersonalRecords([a,b,invalid,noDetail], 'ninja');
assert.equal(all.gamesWithVisits,2,'Pas de record sur les parties sans journal ni invalides');
assert.equal(all.contractsAttempted,7,'Capital initial et reprises exclus');
assert.equal(all.contractsSucceeded,5);
const n20=all.contracts.find(x=>x.id==='n20');
assert.deepEqual([n20.attempts,n20.successes,n20.bestCredited,n20.totalCredited],[2,2,100,160]);
assert.equal(n20.bestCreditedVariant,'OFFICIEL');
assert.equal(all.bestGain.value,100);
assert.equal(all.bestGain.contractId,'n20');
assert.equal(all.bestStreak.value,2);
assert.equal(all.bestPeak.value,205);
const onlyStandard=buildCapitalPersonalRecords([b], 'ninja');
assert.deepEqual([onlyStandard.gamesWithVisits,onlyStandard.contractsAttempted,onlyStandard.contractsSucceeded],[1,3,2]);
assert.equal(onlyStandard.contracts.find(x=>x.id==='n20').bestCredited,60);
const missingScore=match('e','expert','EXPERT',[visit(0,'capital',true,30,30,0,30),{contractIndex:1,contractId:'shanghai',success:true,playerId:'ninja',rawVisitScore:120,scoreBefore:30,scoreAfter:130}]);
const missing=buildCapitalPersonalRecords([missingScore],'ninja');
assert.equal(missing.contracts[0].bestCredited,null,'Ne jamais inventer des points crédités depuis les points bruts');
assert.equal(missing.contracts[0].successes,1);
const incomplete=match('f','clubs15','OFFICIEL',[
 visit(0,'capital',true,20,20,0,20),visit(1,'n20',true,20,20,20,40),
 visit(3,'n19',true,19,19,40,59), // tour 3 absent -> série interrompue
]);
assert.equal(buildCapitalPersonalRecords([incomplete],'ninja').bestStreak.value,1);
const none=buildCapitalPersonalRecords([noDetail],'ninja');
assert.deepEqual([none.gamesWithVisits,none.contractsAttempted,none.contracts.length],[0,0,0]);
const tab=read('src/components/stats/CapitalStatsTabFull.tsx');
assert.match(tab,/buildCapitalPersonalRecords\(matches,/);
assert.match(tab,/Records personnels · contrats & variantes/);
assert.match(tab,/overflowX: "auto"/);
assert.match(tab,/bestCredited/);
console.log('CAPITAL V160 OK — records personnels par contrat/variante, scores créditeurs uniquement, identités, reprises, diagnostics et absence de fabrication.');
