import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildChallengeExerciseProgress } from '../src/lib/challengeExerciseProgress.ts';
import type { ChallengeExerciseCareer } from '../src/lib/challengeExerciseCareer.ts';
import type { ChallengeExerciseAnalytics } from '../src/lib/challengeExercises.ts';

const prior:ChallengeExerciseCareer={
  matches:4,firstPlayedAt:1,lastPlayedAt:4,bestScore:120,averageScore:100,averageValidationRate:62.5,bestValidationRate:75,bestValidatedVisitStreak:4,bestPerfectVisitStreak:2,perfectVisits:5,halfItCuts:3,groupingDoublets:6,groupingTriplets:2,groupingPoints:240,
  objectives:[
    {objective:'15',label:'15',attempts:4,validated:2,perfect:0,points:70,cuts:1,validationRate:50},
    {objective:'16',label:'16',attempts:4,validated:3,perfect:1,points:96,cuts:0,validationRate:75},
  ],strongestObjective:null,weakestObjective:null,dangerObjective:null,
  groupingSectors:[{sector:18,hits:8},{sector:19,hits:4}],topGroupingSector:{sector:18,hits:8},
  recent:[{playedAt:3,score:108,validationRate:60},{playedAt:4,score:115,validationRate:70}],trendDelta:10,
};
const current:ChallengeExerciseAnalytics={
 type:'sequence',visitsPlayed:2,completedVisits:2,validatedVisits:1,failedVisits:1,validationRate:80,perfectVisits:1,bestValidatedVisitStreak:5,bestPerfectVisitStreak:3,bestVisitPoints:60,
 objectiveStats:{'15':{attempts:1,validated:1,perfect:1,points:45},'16':{attempts:1,validated:0,perfect:0,points:0}},visitStats:[],halfItCuts:0,halfItLowestScore:0,halfItEndScore:0,groupingDoublets:0,groupingTriplets:0,groupingPoints:0,groupingSectorHits:{},topGroupingSector:null,topGroupingSectorHits:0,
};
const progress=buildChallengeExerciseProgress(140,current,prior,{exerciseType:'sequence',visits:2,sequenceObjectives:['15','16']});
assert.equal(progress.records.length,4);
assert.equal(progress.scoreDeltaFromLast,25);
assert.equal(progress.validationDeltaFromLast,10);
assert.equal(progress.improvedObjective?.objective,'15');
assert.equal(progress.regressedObjective?.objective,'16');

const grouping={...current,type:'grouping' as const,validationRate:75,objectiveStats:{},groupingSectorHits:{'18':4,'19':0}};
const groupingProgress=buildChallengeExerciseProgress(130,grouping,prior,{exerciseType:'grouping',visits:2,groupingMin:15,groupingMax:20,groupingHits:2});
assert.equal(groupingProgress.improvedSector?.sector,18);
assert.equal(groupingProgress.regressedSector?.sector,19);

const play=fs.readFileSync('./src/pages/ChallengePlay.tsx','utf8');
for(const marker of ['PROGRESSION PERSONNELLE','NOUVEAU RECORD','OBJECTIF EN PROGRÈS','OBJECTIF EN RECUL','SECTEUR EN PROGRÈS','finishExerciseProgressByPlayer'])assert.ok(play.includes(marker),`ChallengePlay missing V47 marker ${marker}`);
console.log('✅ CHALLENGE EXERCISES V47 — automatic records, previous-match deltas and objective/sector progression OK');
