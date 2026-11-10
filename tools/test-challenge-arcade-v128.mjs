import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CHALLENGE_ARCADE_CATALOG,isArcadeChallengePlayable} from '../src/lib/challengeArcadeCatalog.ts';
import {EXISTING_CHALLENGE_MODES,CHALLENGE_MODE_OPTIONS,CHALLENGE_MODE_FAMILIES} from '../src/lib/challengeUnifiedCatalog.ts';
import {BOARD_CLOCKWISE,arcadeObjectives,arcadeRuleDetails,arcadeHitValue,evaluateArcadeProgress,currentArcadePlayer,oppositeSector,compareArcadeRanks} from '../src/lib/challengeArcadeEngine.ts';
const cfg=(id,changes={})=>({catalogChallengeId:id,catalogLine:20,catalogRounds:5,catalogVariant:'classic',catalogTarget:100,catalogMin:60,catalogMax:80,catalogLives:3,...changes});
const hit=(zone,segment,pid='A')=>({zone,segment,pid});
const fromObjective=(obj,pid='A')=>hit(obj.zone==='S'?'G':obj.zone==='NUMBER'?'G':obj.zone==='ANY'?'G':obj.zone,obj.segment??(obj.zone==='ANY'?20:null),pid);
const progress=(id,hits=[],extras={})=>evaluateArcadeProgress(hits,cfg(id,extras),hits,'A');
assert.equal(CHALLENGE_ARCADE_CATALOG.length,44,'42 new challenges + 2 previously agreed');
assert.equal(new Set(CHALLENGE_ARCADE_CATALOG.map(i=>i.id)).size,44,'no duplicate IDs');
assert.equal(CHALLENGE_ARCADE_CATALOG.filter(i=>i.status==='ready').length,44,'every mode now enabled');
assert.equal(CHALLENGE_MODE_OPTIONS.length,51,'7 classic + 44 new, one unified selection');
assert.equal(EXISTING_CHALLENGE_MODES.length,7);
assert.equal(CHALLENGE_MODE_FAMILIES.length,7);
assert.equal(CHALLENGE_MODE_OPTIONS.filter(i=>i.state==='available').length,51);
for(const item of CHALLENGE_ARCADE_CATALOG){
 assert.ok(isArcadeChallengePlayable(item.id),item.id+' available');
 const c=cfg(item.id,{catalogRounds:3});
 const details=arcadeRuleDetails(c);
 assert.ok(details.hint.length>=20,item.id+' has a real rule');
 assert.ok(details.minPlayers>=1,item.id+' min players valid');
 const objs=arcadeObjectives(c,'A');
 if(details.kind==='path'||details.kind==='team') assert.ok(objs.length>0,item.id+' has targets');
 let hits=objs.length?objs.map(obj=>fromObjective(obj)):[hit('G',20),hit('G',19),hit('D',18),hit('MISS',null),hit('T',20),hit('DBULL',null),hit('D',20),hit('G',10),hit('D',10)];
 const a=evaluateArcadeProgress(hits,c,hits,'A');
 assert.ok(Number.isFinite(a.score),item.id+' score finite');
 assert.ok(a.attempts>=0,item.id+' attempts nonnegative');
 assert.ok(a.accuracy>=0&&a.accuracy<=100,item.id+' accuracy bounded');
 assert.ok(a.index>=0,item.id+' progress nonnegative');
 assert.ok(a.successes<=a.attempts,item.id+' success count bounded');
 assert.ok(Array.isArray(a.hitResults),item.id+' hit sequence');
}
const line=cfg('perfect-line',{catalogLine:17});
assert.deepEqual(arcadeObjectives(line).map(x=>x.label),['D17','G17','T17','P17','BULL 25','DBULL 50']);
const correct=arcadeObjectives(line).map(fromObjective);
const faulty=[correct[0],hit('P',17),...correct.slice(1)];
assert.equal(evaluateArcadeProgress(faulty,line).attempts,7);
assert.equal(evaluateArcadeProgress(faulty,line).index,6);
assert.equal(evaluateArcadeProgress(faulty.slice(0,-1),line).current?.label,'DBULL 50');
assert.equal(evaluateArcadeProgress([hit('D',17),hit('G',17),hit('T',17),hit('G',17)],line).index,3,'G and P not interchangeable');
assert.equal(oppositeSector(20),3);assert.equal(oppositeSector(1),19);
for(const sector of BOARD_CLOCKWISE)assert.equal(oppositeSector(oppositeSector(sector)),sector);
for(const variant of ['classic','doubles','triples']){
 const c=cfg('opposites',{catalogRounds:1,catalogVariant:variant});
 assert.deepEqual(arcadeObjectives(c).map(x=>x.label),[(variant==='classic'?'S':variant==='doubles'?'D':'T')+'20',(variant==='classic'?'S':variant==='doubles'?'D':'T')+'3']);
}
const lock=cfg('lock',{catalogRounds:1});
assert.equal(evaluateArcadeProgress([hit('G',20),hit('MISS',null),hit('MISS',null),hit('MISS',null)],lock).index,0,'lock resets after 3 double misses');
assert.equal(evaluateArcadeProgress([hit('G',20),hit('D',20)],lock).complete,true);
const collector=cfg('collector');
assert.equal(evaluateArcadeProgress(['T','P','G','D','BULL','DBULL'].map(z=>hit(z,z==='BULL'||z==='DBULL'?null:20)),collector).complete,true);
assert.equal(evaluateArcadeProgress(['G','G'].map(z=>hit(z,20)),collector).index,1,'no duplicate collection');
const exact=cfg('exact-count',{catalogTarget:100,catalogRounds:1});
assert.equal(evaluateArcadeProgress([hit('S',20),hit('D',20),hit('D',20)],exact).score,100); // S is not a legal keypad zone, only for target acceptance test
assert.equal(evaluateArcadeProgress([hit('G',20),hit('D',20),hit('D',20)],exact).score,100);
assert.equal(evaluateArcadeProgress([hit('T',20),hit('T',20),hit('T',20)],exact).score,0,'overshoot must not score');
assert.equal(progress('triple-precision',[hit('T',20),hit('T',19),hit('T',18)],{catalogRounds:1}).score,300);
assert.equal(progress('winning-trio',[hit('G',20),hit('D',19),hit('T',18)],{catalogRounds:1}).score,150);
assert.ok(progress('double-impact',[hit('D',20),hit('D',19),hit('MISS',null)],{catalogRounds:1}).score>0);
assert.equal(progress('three-kings',[hit('G',20),hit('G',19),hit('G',18)],{catalogRounds:1}).score,200);
assert.equal(progress('green-zone',[hit('G',20),hit('G',20),hit('G',20)],{catalogRounds:1}).score,100);
assert.equal(progress('all-or-nothing',[hit('D',20),hit('G',20),hit('T',20)],{catalogRounds:1}).score,300);
assert.equal(progress('all-or-nothing',[hit('D',20),hit('P',19),hit('T',20)],{catalogRounds:1}).score,0);
assert.equal(progress('three-sectors',[hit('G',20),hit('G',19),hit('G',18)],{catalogRounds:1}).score,57);
assert.equal(progress('three-sectors',[hit('G',20),hit('G',20),hit('G',18)],{catalogRounds:1}).score,0);
assert.equal(progress('rescue',[hit('MISS',null),hit('MISS',null),hit('G',20)],{catalogRounds:1}).score,100);
assert.equal(progress('armored-streak',[hit('G',20),hit('G',20),hit('G',20)],{catalogRounds:1}).score,60);
assert.equal(progress('no-safety-net',[hit('MISS',null),hit('G',20)]).attempts,1,'end at first miss');
assert.equal(progress('three-lives',[hit('MISS',null),hit('MISS',null),hit('MISS',null)]).complete,true,'end when lives exhausted');
assert.equal(progress('three-lives',[hit('MISS',null),hit('MISS',null),hit('MISS',null)]).lives,0);
assert.equal(progress('contracts',[hit('D',20),hit('D',19),hit('BULL',null),hit('T',18)],{catalogRounds:3}).index,3);
assert.equal(progress('contracts',[hit('D',20),hit('D',19),hit('BULL',null),hit('T',18)],{catalogRounds:3}).complete,true);
assert.equal(progress('bounty-hunt',[hit('G',20),hit('G',20)]).index,1,'duplicate bounties impossible');
assert.equal(arcadeHitValue(hit('DBULL',null)),50);
assert.equal(arcadeHitValue(hit('T',19)),57);
const pairs=[hit('G',20),hit('G',19),hit('G',18)];
assert.equal(currentArcadePlayer(pairs,['A','B'],cfg('three-sectors',{catalogRounds:1})),'B');
const relay=cfg('perfect-relay',{catalogRounds:2});
const relayObj=arcadeObjectives(relay);const first=fromObjective(relayObj[0],'A');
assert.equal(currentArcadePlayer([first],['A','B'],relay),'B','next teammate after first objective');
assert.equal(evaluateArcadeProgress([first],relay,[first],'A').index,1);
const all=fs.readFileSync('src/pages/ChallengeConfig.tsx','utf8');
assert.ok(all.includes('chooseUnifiedMode(choice)'), 'single category chooser preserved');
assert.ok(all.includes('arcadeRuleDescription(arcadeConfig)'), 'real mode-specific rules displayed');
assert.ok(!all.includes('CATALOGUE · 44 CHALLENGES'));
console.log('✅ CHALLENGE V128 — 44 modes jouables, 51 cartes unifiées, règles, progression, scoring, précision G/P, relais, règles multi');
// Reprises/annulations : le même journal doit produire exactement le même résultat.
const afterUndo=[hit('D',20),hit('G',20),hit('T',20),hit('P',20)];
assert.deepEqual(evaluateArcadeProgress(afterUndo,line).hitResults,evaluateArcadeProgress([...afterUndo,hit('MISS',null)].slice(0,-1),line).hitResults);
// Choix du roi : le risque est capturé dans le lancer, indépendamment du réglage de départ.
const choice=cfg('kings-choice',{catalogRounds:1});
assert.equal(evaluateArcadeProgress([{...hit('T',20),choice:'triples'}],choice).score,50);
assert.equal(evaluateArcadeProgress([{...hit('T',20),choice:'doubles'}],choice).score,0);
// Défi fantôme : la référence historique ne modifie jamais les points réellement obtenus.
const ghost=cfg('ghost-challenge',{catalogRounds:1,catalogGhost:[30,90,100]});
const g1=evaluateArcadeProgress([hit('G',20),hit('D',20),hit('T',20)],ghost);
assert.equal(g1.score,120);
assert.ok(g1.message.includes('FANTÔME'));
// Revanche : uniquement la zone ratée annoncée par l'autre joueur peut doubler les points.
const r=cfg('revenge',{catalogRounds:1});
const firstMiss={...hit('MISS',null,'A'),intendedZone:'D',intendedSegment:19};
const response=hit('D',19,'B');
const mixed=[firstMiss,response];
assert.equal(evaluateArcadeProgress([response],r,mixed,'B').score,76);
assert.equal(evaluateArcadeProgress([hit('G',19,'B')],r,[firstMiss,hit('G',19,'B')],'B').score,19);
// Copie conforme : répétition exacte, dans le bon ordre, du tour précédent.
const copy=cfg('exact-copy',{catalogRounds:1});
const a=[hit('D',20,'A'),hit('T',19,'A'),hit('BULL',null,'A')];
const b=[hit('D',20,'B'),hit('T',19,'B'),hit('BULL',null,'B')];
assert.equal(evaluateArcadeProgress(b,copy,[...a,...b],'B').score,300);
const bMist=[hit('D',20,'B'),hit('G',19,'B'),hit('BULL',null,'B')];
assert.equal(evaluateArcadeProgress(bMist,copy,[...a,...bMist],'B').score,200);
// Territoires : simple libre, double vole, triple protège.
const ownership=[hit('G',20,'A'),hit('D',20,'B'),hit('T',20,'B')];
assert.equal(evaluateArcadeProgress(ownership.filter(x=>x.pid==='B'),cfg('territory-war'),ownership,'B').score,100);
assert.equal(evaluateArcadeProgress(ownership.filter(x=>x.pid==='A'),cfg('territory-war'),ownership,'A').score,0);
// No duplicate score when a darts cap has already been reached.
const three=cfg('three-sectors',{catalogRounds:1});
const base=[hit('G',20),hit('G',19),hit('G',18)];
assert.equal(evaluateArcadeProgress([...base,hit('T',20)],three).score,evaluateArcadeProgress(base,three).score);
console.log('✅ CHALLENGE V128 — fantôme, copie exacte, revanche, risque au tour, territoires, annulation, limites');
// Tous les parcours doivent finir sur le dernier objectif, sans règle implicite cachée.
for(const item of CHALLENGE_ARCADE_CATALOG){
 const c=cfg(item.id,{catalogRounds:2});
 const details=arcadeRuleDetails(c);
 if(details.kind!=='path'&&details.kind!=='team')continue;
 const objectives=arcadeObjectives(c,'A');
 const darts=objectives.map(o=>fromObjective(o));
 const state=evaluateArcadeProgress(darts,c,darts,'A');
 assert.ok(state.complete,item.id+' must complete with exact targets');
 assert.equal(state.remaining,0,item.id+' should leave no pending goals');
 if(item.id!=='collector')assert.equal(state.attempts,objectives.length,item.id+' no hidden additional darts');
}
console.log('✅ CHALLENGE V128 — tous les parcours terminables avec des impacts exacts');
