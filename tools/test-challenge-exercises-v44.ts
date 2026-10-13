import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  analyzeChallengeExercise,
  type ChallengeEntryLike,
  type ChallengeExerciseConfigLike,
  type ChallengeHit,
} from '../src/lib/challengeExercises.ts';

const dart=(hit:ChallengeHit,segment?:number):ChallengeEntryLike=>({hit,...(segment?{segment}:{})});

const clock:ChallengeExerciseConfigLike={target:'1',rule:'all',visits:3,exerciseType:'clock',clockIncludeBull:false,clockScoreMode:'challenge'};
const clockStats=analyzeChallengeExercise([
  dart('S'),dart('D'),dart('T'),
  dart('MISS'),dart('MISS'),dart('MISS'),
  dart('D'),dart('MISS'),dart('MISS'),
],clock);
assert.equal(clockStats.visitStats.length,3);
assert.deepEqual(clockStats.visitStats.map(v=>[v.objective,v.validated,v.successfulHits,v.points]),[
  ['1',true,3,6],
  ['2',false,0,0],
  ['3',true,1,2],
]);

const halfIt:ChallengeExerciseConfigLike={target:'15',rule:'all',visits:2,exerciseType:'half-it',halfItStartScore:40,sequenceObjectives:['15','16']};
const halfStats=analyzeChallengeExercise([
  dart('MISS'),dart('MISS'),dart('MISS'),
  dart('S'),dart('D'),dart('MISS'),
],halfIt);
assert.equal(halfStats.visitStats[0].halfItCut,true);
assert.equal(halfStats.visitStats[0].scoreBefore,40);
assert.equal(halfStats.visitStats[0].scoreAfter,20);
assert.equal(halfStats.visitStats[0].delta,-20);
assert.equal(halfStats.visitStats[1].halfItCut,false);
assert.equal(halfStats.visitStats[1].scoreBefore,20);
assert.equal(halfStats.visitStats[1].scoreAfter,68);

const grouping:ChallengeExerciseConfigLike={target:'15',rule:'all',visits:1,exerciseType:'grouping',groupingMin:15,groupingMax:20,groupingHits:2};
const groupingStats=analyzeChallengeExercise([dart('D',18),dart('S',18),dart('T',20)],grouping);
assert.equal(groupingStats.visitStats[0].groupingSector,18);
assert.equal(groupingStats.visitStats[0].points,54);

const play=fs.readFileSync('src/pages/ChallengePlay.tsx','utf8');
for(const marker of ['LECTURE OBJECTIF PAR OBJECTIF','objective-performance-grid','OBJECTIF FORT','ZONE À SÉCURISER','objective-score-shift']){
  assert.ok(play.includes(marker),`ChallengePlay missing V44 marker ${marker}`);
}

console.log('✅ CHALLENGE EXERCISES V44 — objective-by-objective map, HALF-IT cuts and visit timeline OK');
