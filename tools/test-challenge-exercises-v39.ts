import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  analyzeChallengeExercise,
  evaluateChallengeEntries,
  type ChallengeEntryLike,
  type ChallengeExerciseConfigLike,
  type ChallengeHit,
} from '../src/lib/challengeExercises.ts';

const dart=(hit:ChallengeHit,segment?:number):ChallengeEntryLike=>({hit,...(segment?{segment}:{})});

const grouping:ChallengeExerciseConfigLike={target:'15',rule:'all',visits:2,exerciseType:'grouping',groupingMin:15,groupingMax:20,groupingHits:2};
const groupingEntries=[dart('D',18),dart('S',18),dart('T',20),dart('T',18),dart('D',18),dart('S',18)];
const groupingStats=analyzeChallengeExercise(groupingEntries,grouping);
assert.equal(groupingStats.bestValidatedVisitStreak,2,'two consecutive grouped visits must create a 2-visit streak');
assert.equal(groupingStats.bestPerfectVisitStreak,1,'only the triplet visit is perfect');
assert.equal(groupingStats.bestVisitPoints,108,'triplet D/S/T on 18 must be the best grouped visit');
assert.equal(groupingStats.objectiveStats['group:15-20']?.attempts,2,'grouping objective must keep visit-level records');
assert.equal(groupingStats.groupingPoints,162);

const halfIt:ChallengeExerciseConfigLike={target:'15',rule:'all',visits:2,exerciseType:'half-it',halfItStartScore:40,sequenceObjectives:['15','16']};
const halfEntries=[dart('MISS'),dart('MISS'),dart('MISS'),dart('S'),dart('D'),dart('MISS')];
const halfEval=evaluateChallengeEntries(halfEntries,halfIt);
const halfStats=analyzeChallengeExercise(halfEntries,halfIt);
assert.equal(halfEval.score,68);
assert.equal(halfStats.halfItLowestScore,20,'HALF-IT lowest score must record the cut');
assert.equal(halfStats.halfItEndScore,68,'HALF-IT end score must be preserved in exercise analytics');
assert.equal(halfStats.bestValidatedVisitStreak,1);
assert.equal(halfStats.objectiveStats['15']?.validated,0);
assert.equal(halfStats.objectiveStats['16']?.validated,1);

const clock:ChallengeExerciseConfigLike={target:'1',rule:'all',visits:2,exerciseType:'clock',clockIncludeBull:false,clockScoreMode:'challenge'};
const clockStats=analyzeChallengeExercise([dart('S'),dart('D'),dart('T'),dart('MISS'),dart('MISS'),dart('MISS')],clock);
assert.equal(clockStats.bestVisitPoints,6);
assert.equal(clockStats.objectiveStats['1']?.perfect,1);
assert.equal(clockStats.objectiveStats['2']?.validated,0);

const play=fs.readFileSync('src/pages/ChallengePlay.tsx','utf8');
for(const marker of ['exercise-board-hud','exercise-live-progress','finish-exercise-badge','finish-exercise-records','makeExerciseRecordCards','STATS EXERCICE']){
  assert.ok(play.includes(marker),`ChallengePlay missing V39 marker ${marker}`);
}

console.log('✅ CHALLENGE EXERCISES V39 — exercise identity, route HUD, dedicated records and final result card OK');
