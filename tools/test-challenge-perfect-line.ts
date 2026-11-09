import assert from 'node:assert/strict';
import { challengeExerciseType, challengeObjectiveKeyTarget, compareChallengeRankRows, evaluateChallengeEntries, analyzeChallengeExercise, challengeExerciseConfigFromRules } from '../src/lib/challengeExercises.ts';
import { perfectLineLabels, perfectLineProgress, perfectLineNextParticipant } from '../src/lib/challengePerfectLine.ts';

const cfg={target:'18',rule:'all',visits:6,exerciseType:'perfect-line' as const,perfectLineSegment:18};
const D=(segment:number)=>({hit:'D' as const,segment});
const T=(segment:number)=>({hit:'T' as const,segment});
const G=(segment:number)=>({hit:'S' as const,segment,singleZone:'G' as const});
const P=(segment:number)=>({hit:'S' as const,segment,singleZone:'P' as const});
const bull={hit:'25' as const},dbull={hit:'50' as const},miss={hit:'MISS' as const};

assert.equal(challengeExerciseType(cfg),'perfect-line');
assert.equal(challengeObjectiveKeyTarget(cfg),'perfect-line-18');
assert.equal(challengeObjectiveKeyTarget({...cfg,perfectLineSegment:12}),'perfect-line-12');
assert.deepEqual(perfectLineLabels(cfg),['D18','G18','T18','P18','BULL25','DBULL50']);
assert.equal(challengeExerciseConfigFromRules({exerciseConfig:cfg}).perfectLineSegment,18);

// Only the exact segment AND the exact ring validates the active stage.
const entries=[D(20),miss,D(18),P(18),G(20),G(18),T(20),T(18),G(18),P(18),dbull,bull,bull,dbull];
const progress=perfectLineProgress(entries,cfg);
assert.equal(progress.finished,true);
assert.equal(progress.step,6);
assert.equal(progress.darts,14);
assert.deepEqual(progress.stageAttempts,[3,3,2,2,2,2]);
assert.deepEqual(progress.stageCompletedOnDart,[3,6,8,10,12,14]);
assert.deepEqual(evaluateChallengeEntries(entries,cfg).entrySuccessful,entries.map((_,index)=>[2,5,7,9,11,13].includes(index)));
assert.equal(evaluateChallengeEntries(entries,cfg).score,6);
assert.equal(analyzeChallengeExercise(entries,cfg).perfectLineDarts,14);
assert.equal(analyzeChallengeExercise(entries,cfg).perfectLineCompleted,true);

// The unbeatable perfect line is six darts; no timer or fixed dart limit.
const perfect=[D(18),G(18),T(18),P(18),bull,dbull];
assert.equal(perfectLineProgress(perfect,cfg).step,6);
assert.equal(perfectLineProgress(perfect,cfg).darts,6);
const extended=[...Array.from({length:60},()=>miss),...perfect];
assert.equal(perfectLineProgress(extended,cfg).step,6);
assert.equal(perfectLineProgress(extended,cfg).darts,66);
assert.ok(compareChallengeRankRows({score:6,darts:6},{score:6,darts:14},cfg)<0);
assert.ok(compareChallengeRankRows({score:5,darts:6},{score:6,darts:20},cfg)>0);

// Undo state and multi-player turn rotation always derive from saved entries.
const players=[{id:'A'},{id:'B'}];
let log=[D(18),G(18),T(18)].map(hit=>({...hit,pid:'A'}));
assert.equal(perfectLineNextParticipant(log,players,cfg),1);
log=[...log,...[D(18),G(18),T(18)].map(hit=>({...hit,pid:'B'}))];
assert.equal(perfectLineNextParticipant(log,players,cfg),0);
log=[...log,...[P(18),bull,dbull].map(hit=>({...hit,pid:'A'}))];
assert.equal(perfectLineProgress(log.filter(e=>e.pid==='A'),cfg).finished,true);
assert.equal(perfectLineNextParticipant(log,players,cfg),1);
log=[...log,...[P(18),bull,dbull].map(hit=>({...hit,pid:'B'}))];
assert.equal(perfectLineProgress(log.filter(e=>e.pid==='B'),cfg).finished,true);
assert.equal(perfectLineProgress(log.slice(0,-1).filter(e=>e.pid==='B'),cfg).finished,false);
console.log('✅ CHALLENGE LIGNE PARFAITE — secteur configurable, zones strictes, progression, classement, annulation, multi');
