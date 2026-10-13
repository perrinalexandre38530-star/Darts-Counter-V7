import assert from 'node:assert/strict';
import { evaluateChallengeEntries, objectiveForVisit, challengeObjectiveKeyTarget } from '../src/lib/challengeExercises.ts';

const e=(hit,segment)=>({hit,segment});

// Groupement 15-20 : D18 + S18 + T20 => seuls les deux 18 comptent = 54.
let cfg={target:'15',rule:'all',visits:1,exerciseType:'grouping',groupingMin:15,groupingMax:20,groupingHits:2};
let result=evaluateChallengeEntries([e('D',18),e('S',18),e('T',20)],cfg);
assert.equal(result.score,54);
assert.deepEqual(result.entrySuccessful,[true,true,false]);

// Deux secteurs différents ne valident rien.
result=evaluateChallengeEntries([e('S',15),e('D',16),e('T',17)],cfg);
assert.equal(result.score,0);

// Triplet obligatoire.
cfg={...cfg,groupingHits:3};
result=evaluateChallengeEntries([e('S',19),e('D',19),e('T',19)],cfg);
assert.equal(result.score,114);

// Half-It : départ 40, 15 touché une fois => 55, puis tour 16 raté => ceil(55/2)=28.
cfg={target:'15',rule:'all',visits:9,exerciseType:'half-it',halfItStartScore:40};
result=evaluateChallengeEntries([e('S'),e('MISS'),e('MISS'),e('MISS'),e('MISS'),e('MISS')],cfg);
assert.equal(result.score,28);

// Half-It double libre : D7 vaut 14 points réels.
result=evaluateChallengeEntries([
 e('S'),e('MISS'),e('MISS'), // 15 => +15 = 55
 e('S'),e('MISS'),e('MISS'), // 16 => +16 = 71
 e('D',7),e('MISS'),e('MISS'), // double libre => +14 = 85
],cfg);
assert.equal(result.score,85);

// Horloge : objectifs successifs 1, 2, ... et scoring Challenge S=1 D=2 T=3.
cfg={target:'1',rule:'all',visits:21,exerciseType:'clock',clockIncludeBull:true,clockScoreMode:'challenge'};
assert.equal(objectiveForVisit(cfg,0),'1');
assert.equal(objectiveForVisit(cfg,19),'20');
assert.equal(objectiveForVisit(cfg,20),'bull');
result=evaluateChallengeEntries([e('T'),e('D'),e('S')],cfg);
assert.equal(result.score,6);

// Séquence réelle : T20 + D libre 7 = 60 + 14.
cfg={target:'20',rule:'all',visits:2,exerciseType:'sequence',sequenceObjectives:['20','any-double'],sequenceScoreMode:'real'};
result=evaluateChallengeEntries([e('T'),e('MISS'),e('MISS'),e('D',7),e('MISS'),e('MISS')],cfg);
assert.equal(result.score,74);

assert.match(challengeObjectiveKeyTarget({target:'15',rule:'all',visits:10,exerciseType:'grouping',groupingMin:15,groupingMax:20,groupingHits:2}),/^grouping-15-20-x2$/);
console.log('✅ Challenge exercises V1 — scoring, Half-It, Horloge, Séquence et Groupement OK');
