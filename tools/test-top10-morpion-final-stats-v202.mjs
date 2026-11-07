import assert from 'node:assert/strict';
import { computeTop10MorpionStats } from '../src/lib/top10MorpionStats.ts';
import { top10MorpionLabel as label } from '../src/lib/top10MorpionLabels.ts';
const t = (scores, id='a') => scores.map((score, i)=>({playerId:id,visitIndex:i,score,darts:[{bed:'S',score:score/3},{bed:'S',score:score/3},{bed:'S',score:score/3}]}));
const record = (id, arr, other=Array(10).fill(50)) => ({ id, matchId:id, mode:'top_10', status:'finished', finishedAt:1700000000000,
  winnerId:'a', players:[{id:'a',name:'A',score:arr.reduce((a,b)=>a+b,0)},{id:'b',name:'B',score:500}],
  payload:{visitScores:[arr,other],visits:[...t(arr),...t(other,'b')],visitHistory:[...t(arr),...t(other,'b')]},
  summary:{finished:true,perPlayer:{a:{total:arr.reduce((a,b)=>a+b,0)}}}
});
const ten=[60,80,100,120,140,160,20,40,50,70];
const actual=ten.reduce((a,b)=>a+b,0);
const one=record('m1',ten);
const active={...one,status:'in_progress',id:'m-active',matchId:'m-active'};
const same={...one,updatedAt:1700000000001};
const two=record('m2',Array(10).fill(70));
const s=computeTop10MorpionStats([one,one,same,active,two], 'a','top_10');
assert.equal(s.games,2,'only completed unique matches');
assert.equal(s.totalPoints,actual+700,'no final-score/visit double count');
assert.equal(s.visits,20); assert.equal(s.darts,60);
assert.equal(s.bestGame,Math.max(actual,700));
assert.equal(s.bestVisit,160); assert.equal(s.visits100,4); assert.equal(s.visits140,2);
assert.equal(s.averagePointsPerVisit,(actual+700)/20);
assert.equal(computeTop10MorpionStats([one],'unknown','top_10').games,0);
const legacy={...one,id:'legacy',matchId:'legacy',payload:{visits:t(ten)},summary:{finished:true,perPlayer:{a:{total:actual}}}};
const legacyStats=computeTop10MorpionStats([legacy],'a','top_10');
assert.equal(legacyStats.totalPoints,actual); assert.equal(legacyStats.visits,10);
const solo={...record('solo',ten), players:[{id:'a',score:actual}], winnerId:'a', payload:{visitScores:[ten],visits:t(ten)}};
const sSolo=computeTop10MorpionStats([solo],'a','top_10');
assert.equal(sSolo.games,1); assert.equal(sSolo.soloGames,1); assert.equal(sSolo.competitiveGames,0); assert.equal(sSolo.victories,0,'solo training is not a multiplayer win');
const morpion={ id:'ttt',mode:'tic_tac_toe',status:'finished',winnerId:'a',players:[{id:'a',score:2},{id:'b',score:1}],
 payload:{matchWins:[2,1],grid:{owners:[0,0,0,null,null,null,1,null,null],marks:[[4,0],[4,0],[4,0],[0,0],[1,1],[0,0],[0,4],[0,0],[0,0]]},visits:[{playerId:'a',darts:[{},{}]}]}}
const m=computeTop10MorpionStats([morpion], 'a','tic_tac_toe');
assert.equal(m.games,1); assert.equal(m.roundsWon,2); assert.equal(m.lastGridCases,3); assert.equal(m.lastGridMarks,13);assert.equal(m.darts,2);
assert.equal(label('en','CONTINUER'),'CONTINUE'); assert.equal(label('fr','CONTINUER'),'CONTINUER');
console.log('OK V202 : scores TOP 10 sans double compte, snapshots dédupliqués, Morpion et libellés FR/EN.');
