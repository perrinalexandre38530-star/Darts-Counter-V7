import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const read = file => readFileSync(new URL('../'+file,import.meta.url),'utf8');
const files = ['src/lib/capitalGame.ts','src/pages/CapitalPlay.tsx','src/components/stats/CapitalContractMatrix.tsx'];
const output={};
for (const file of files) {
  const result=ts.transpileModule(read(file),{fileName:file,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}});
  assert.equal(result.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).length || 0,0,`syntax ${file}`);
  output[file]=result.outputText;
}
const lib=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(output['src/lib/capitalGame.ts']));
const {CAPITAL_CONTRACT_META,applyCapitalVisit,evaluateCapitalContract,capitalContractSuccess,capitalAggregateIsVerifiable,applyCapitalAggregateVisit,capitalTotalPossible,buildCapitalPlayerStats}=lib;
const S=v=>({v,mult:1});const D=v=>({v,mult:2});const T=v=>({v,mult:3});
const B=S(25),DB=D(25),MISS={v:0,mult:1,zone:'miss'},OUTSIDE={v:0,mult:1,zone:'outside'};
const ext=v=>({v,mult:1,zone:'outer-single'});
const test=(id,darts,before,score,qualifications,success=true,options={})=>{
  const result=applyCapitalVisit(before,id,darts,true,options);
  assert.equal(result.success,success,`${id}: réussite`);
  assert.equal(result.visitScore,score,`${id}: points admissibles`);
  if (qualifications!==null) assert.equal(result.qualifiedDarts,qualifications,`${id}: hits qualifiés`);
  assert.equal(result.scoreAfter,id==='capital'?score:success?before+score+(result.bonusPoints||0):Math.floor(before/2),`${id}: capital`);
  if (!success) assert.equal(result.visitScore,0,`${id}: un échec n'accorde aucun point`);
  return result;
};
// Segments 20..13 : comptabiliser uniquement le numéro demandé, avec multiplicateurs.
for (let n=13;n<=20;n++){
  const other=n===20?19:20;
  test(`n${n}`,[S(n),T(other),D(n)],72,n*3,2);
  test(`n${n}`,[T(other),D(other),B],101,0,0,false);
  const outside={v:n,mult:1,zone:'outside'};
  test(`n${n}`,[outside,T(other),MISS],101,0,0,false);
}
// Même principe : DOUBLE/TRIPLE/CENTRE, sans les touches des autres familles.
test('double_any',[D(6),T(20),S(19)],100,12,1);
test('double_any',[DB,T(20),S(19)],100,50,1);
test('double_any',[T(20),S(19),B],101,0,0,false);
test('triple_any',[T(18),D(20),S(20)],100,54,1);
test('triple_any',[D(20),S(20),DB],101,0,0,false);
test('center',[B,DB,T(20)],100,75,2);
test('center',[D(20),T(20),S(1)],101,0,0,false);
// Capital initial : tout compte ; contrats à 3 impacts : réussite intégrale ou aucun point.
test('capital',[S(20),T(5),D(20)],0,75,3);
test('suite',[S(14),T(15),D(16)],100,91,3);
test('suite',[S(14),T(15),D(17)],101,0,0,false);
test('side',[S(16),T(7),D(19)],100,75,3);
test('side',[S(16),T(7),D(18)],101,0,0,false);
test('colors_3',[S(20),S(19),D(20)],100,79,3);
test('colors_3',[S(20),S(20),S(20)],101,0,0,false);
test('exact_57',[T(19),MISS,MISS],100,57,1);
test('exact_57',[T(20),MISS,MISS],101,0,0,false);
test('exact_42',[D(20),S(2),MISS],100,42,2);
test('exact_69',[S(19),DB,MISS],100,69,2);
test('exact_custom',[S(11),S(12),S(13)],100,36,3,true,{exactTarget:36});
test('exact_custom',[S(11),S(12),S(13)],101,0,0,false,{exactTarget:42});
test('peluche',[S(7),S(6),S(6)],100,19,3);
test('peluche',[S(10),S(10),S(10)],101,0,0,false);
test('diagonal',[S(20),B,T(3)],100,54,3);
test('diagonal',[S(20),DB,T(3)],101,0,0,false);
test('shanghai',[S(10),D(10),T(10)],100,60,3,true,{shanghaiBonus:10});
test('shanghai',[S(10),D(10),T(11)],101,0,0,false);
test('even_3',[S(2),D(4),T(6)],100,28,3);
test('even_3',[S(2),D(4),T(7)],101,0,0,false);
test('odd_3',[S(1),D(3),T(5)],100,22,3);
test('odd_3',[S(1),D(3),T(4)],101,0,0,false);
test('packet',[S(12),S(12),S(12)],100,36,3);
test('packet',[D(12),D(12),D(12)],100,72,3,true,{packetAllowMultipliers:true});
test('packet',[D(12),D(12),D(12)],101,0,0,false);
test('four_corners',[S(20),T(3),D(11)],100,51,3);
test('four_corners',[S(20),S(10),D(11)],101,0,0,false);
test('outer_single',[ext(20),ext(19),ext(18)],100,57,3);
test('outer_single',[S(20),ext(19),ext(18)],101,0,0,false);
test('bad_hand',[S(1),S(2),S(3)],100,6,3,true,{manualValidated:true});
test('bad_hand',[S(1),S(2),S(3)],101,0,0,false);
test('poubelle',[OUTSIDE,OUTSIDE,OUTSIDE],100,0,0);
test('poubelle',[OUTSIDE,OUTSIDE,MISS],101,0,0,false);
test('petit_score',[S(1),S(2),S(3)],100,6,3);
test('petit_score',[S(1),S(2),S(7)],101,0,0,false);
assert.equal(Object.keys(CAPITAL_CONTRACT_META).length,30,'30 contrats audités');
// Total vérifiable seulement pour capital et score exact, jamais pour les segments ou combinaisons.
for(const id of Object.keys(CAPITAL_CONTRACT_META)){
  const safe=['capital','exact_57','exact_42','exact_69','exact_custom'].includes(id);
  assert.equal(capitalAggregateIsVerifiable(id),safe,id);
  const r=applyCapitalAggregateVisit(100,id,42,true);
  assert.equal(r.requiresDetail,!safe,`protection score volée: ${id}`);
  if(!safe) assert.equal(r.scoreAfter,100,`pas de crédit anticipé: ${id}`);
}
assert.equal(capitalTotalPossible(180,3),true);
assert.equal(capitalTotalPossible(179,3),false);
assert.equal(capitalTotalPossible(60,1),true);
assert.equal(capitalTotalPossible(69,1),false);
assert.equal(applyCapitalAggregateVisit(100,'exact_42',42,false).scoreAfter,142);
assert.equal(applyCapitalAggregateVisit(100,'exact_57',56,true).scoreAfter,50);
// Stats : vrai score brut et crédit, dartsUsed fiable, impacts connus conservés.
const players=[{id:'a',name:'A'}];const opening=applyCapitalVisit(0,'capital',[S(20),T(5),D(20)]);
const numeric=applyCapitalVisit(opening.scoreAfter,'n20',[S(20),T(5),D(20)]);
const visits=[opening,numeric].map((r,i)=>({id:'v'+i,contractId:i?'n20':'capital',contractIndex:i,playerId:'a',playerIndex:0,playerName:'A',darts:[S(20),T(5),D(20)],scoreInputMode:'keypad',dartsUsed:3,createdAt:i,scoreBefore:i?75:0,...r}));
const st=buildCapitalPlayerStats(players,visits,[135])[0];
assert.equal(st.finalCapital,135);assert.equal(st.pointsWon,60);assert.equal(st.rawPointsScored,150);assert.equal(st.knownDarts,6);assert.equal(st.dartsThrown,6);assert.equal(st.validHits,5);
assert.match(read('src/pages/CapitalPlay.tsx'),/DÉTAIL DES IMPACTS OBLIGATOIRE/);
assert.match(read('src/pages/CapitalPlay.tsx'),/pendingDetailTotal !== pendingVisitScore.score/);
assert.match(read('src/pages/CapitalPlay.tsx'),/visitScore: applied.visitScore/);
assert.match(read('src/pages/CapitalPlay.tsx'),/rawVisitScore: applied.rawVisitScore/);
console.log('CAPITAL V156: 30 contrats vérifiés, points filtrés, validation impacts SCORE VOLÉE, statistiques brutes/nettes et pénalités OK.');
