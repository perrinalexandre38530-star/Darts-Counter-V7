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

const grouping:ChallengeExerciseConfigLike={
  target:'15',rule:'all',visits:10,exerciseType:'grouping',groupingMin:15,groupingMax:20,groupingHits:2,
};

const doublet=[dart('D',18),dart('S',18),dart('T',20)];
const doubletEval=evaluateChallengeEntries(doublet,grouping);
assert.equal(doubletEval.score,54,'D18 + S18 must validate sector 18 for 54 points');
assert.deepEqual(doubletEval.entrySuccessful,[true,true,false],'isolated T20 must not score');
const doubletStats=analyzeChallengeExercise(doublet,grouping);
assert.equal(doubletStats.groupingDoublets,1);
assert.equal(doubletStats.groupingTriplets,0);
assert.equal(doubletStats.topGroupingSector,18);
assert.equal(doubletStats.groupingPoints,54);

const triplet=[dart('T',18),dart('D',18),dart('S',18)];
const tripletEval=evaluateChallengeEntries(triplet,grouping);
assert.equal(tripletEval.score,108,'T18 + D18 + S18 must score all three darts');
const tripletStats=analyzeChallengeExercise(triplet,grouping);
assert.equal(tripletStats.groupingTriplets,1);
assert.equal(tripletStats.perfectVisits,1);

const split=[dart('S',15),dart('S',16),dart('S',17)];
assert.equal(evaluateChallengeEntries(split,grouping).score,0,'three different valid sectors must not validate grouping');
assert.equal(analyzeChallengeExercise(split,grouping).validatedVisits,0);

const halfIt:ChallengeExerciseConfigLike={target:'15',rule:'all',visits:9,exerciseType:'half-it',halfItStartScore:40};
const halfMiss=[dart('MISS'),dart('MISS'),dart('MISS')];
assert.equal(evaluateChallengeEntries(halfMiss,halfIt).score,20,'failed HALF-IT visit must halve 40 to 20');
assert.equal(analyzeChallengeExercise(halfMiss,halfIt).halfItCuts,1);
const halfTwoVisits=[...halfMiss,dart('S'),dart('D'),dart('MISS')];
assert.equal(evaluateChallengeEntries(halfTwoVisits,halfIt).score,68,'second objective 16 must add S16 + D16 = 48');

const clock:ChallengeExerciseConfigLike={target:'1',rule:'all',visits:20,exerciseType:'clock',clockIncludeBull:false,clockScoreMode:'challenge'};
assert.equal(evaluateChallengeEntries([dart('S'),dart('D'),dart('T')],clock).score,6,'clock challenge scoring must keep S=1 D=2 T=3');
assert.equal(analyzeChallengeExercise([dart('S'),dart('D'),dart('T')],clock).perfectVisits,1);

const play=fs.readFileSync('src/pages/ChallengePlay.tsx','utf8');
const leaderboard=fs.readFileSync('src/pages/ChallengeLeaderboardPage.tsx','utf8');
for(const marker of ['exercise-live','detailSection===\'EXERCICE\'','exerciseStats:analyzeChallengeExercise','onlineVisitOptions']){
  assert.ok(play.includes(marker),`ChallengePlay missing ${marker}`);
}
assert.ok(leaderboard.includes('visitOptions'), 'Leaderboard must preserve non-standard visit counts such as 21');

console.log('✅ CHALLENGE EXERCISES V37 — grouping, HALF-IT, live feedback, exercise stats and online visit filters OK');
