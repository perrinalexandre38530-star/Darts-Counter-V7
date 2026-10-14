import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildChallengeStatsProgression } from '../src/lib/challengeStatsProgression.ts';

const mk=(id:string,at:number,score:number,validationRate:number,a:number,b:number,group18=0,group19=0)=>({
  id,at,score,exerciseType:'sequence',exerciseStats:{
    validationRate,
    bestValidatedVisitStreak:Math.round(validationRate/20),
    bestPerfectVisitStreak:Math.round(validationRate/40),
    objectiveStats:{
      '15':{attempts:1,validated:a,perfect:0,points:a*15},
      '16':{attempts:1,validated:b,perfect:0,points:b*16},
    },
    groupingSectorHits:{'18':group18,'19':group19},
  },
});

const rows=[
  mk('a',1,100,50,0,1,1,2),
  mk('b',2,110,60,0,1,1,2),
  mk('c',3,120,70,1,1,2,1),
  mk('d',4,125,75,1,0,3,1),
  mk('e',5,140,80,1,0,4,0),
  mk('f',6,150,90,1,0,5,0),
];
const progress=buildChallengeStatsProgression(rows as any);
assert.equal(progress.windowSize,3);
assert.equal(progress.scoreTrend.delta,28.3);
assert.equal(progress.validationTrend.delta,21.7);
assert.equal(progress.momentum,'up');
assert.equal(progress.bestObjectiveProgress?.objective,'15');
assert.equal(progress.biggestObjectiveDrop?.objective,'16');
assert.equal(progress.bestSectorProgress?.sector,18);
assert.equal(progress.biggestSectorDrop?.sector,19);
assert.ok(progress.recordEvents.some(event=>event.kind==='score'&&event.value===150));
assert.ok(progress.recentRecordEvents.length<=6);
assert.equal(progress.currentStrength?.key,'15');
assert.equal(progress.currentWeakness?.key,'16');

const stats=fs.readFileSync('./src/pages/StatsHub.tsx','utf8');
for(const marker of ['PROGRESSION INTELLIGENTE','HISTORIQUE DES RECORDS','FORCE ACTUELLE','À TRAVAILLER','MEILLEURE PROGRESSION RÉCENTE'])assert.ok(stats.includes(marker),`StatsHub missing V48 marker ${marker}`);
console.log('✅ CHALLENGE EXERCISES V48 — Stats Center progression, record history and strengths/work areas OK');
