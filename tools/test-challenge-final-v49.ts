import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  DEFAULT_HALF_IT_SEQUENCE,
  challengeExerciseConfigFromRules,
  challengeObjectiveKeyTarget,
  compareChallengeRankRows,
  evaluateChallengeEntries,
  type ChallengeEntryLike,
  type ChallengeExerciseConfigLike,
  type ChallengeHit,
} from '../src/lib/challengeExercises.ts';

const dart=(hit:ChallengeHit,segment?:number):ChallengeEntryLike=>({hit,...(segment?{segment}:{})});

// HORLOGE : 20 ou 21 tours selon le Bull final, avec clé Online distincte.
const clock20:ChallengeExerciseConfigLike={target:'1',rule:'all',visits:20,exerciseType:'clock',clockIncludeBull:false,clockScoreMode:'challenge'};
const clock21:ChallengeExerciseConfigLike={...clock20,visits:21,clockIncludeBull:true};
assert.equal(challengeObjectiveKeyTarget(clock20),'clock-hits-20');
assert.equal(challengeObjectiveKeyTarget(clock21),'clock-hits-bull');
assert.notEqual(challengeObjectiveKeyTarget(clock20),challengeObjectiveKeyTarget(clock21));

// HALF-IT : état entièrement dérivé du log => Undo restaure bien le score avant la dernière fléchette.
const halfIt:ChallengeExerciseConfigLike={target:'15',rule:'all',visits:DEFAULT_HALF_IT_SEQUENCE.length,exerciseType:'half-it',halfItStartScore:40,sequenceObjectives:[...DEFAULT_HALF_IT_SEQUENCE]};
const halfLog=[dart('MISS'),dart('MISS'),dart('MISS'),dart('S',16),dart('D',16),dart('MISS')];
assert.equal(evaluateChallengeEntries(halfLog,halfIt).score,68);
assert.equal(evaluateChallengeEntries(halfLog.slice(0,3),halfIt).score,20,'Undo/reprise must reconstruct HALF-IT from the remaining log');

// GROUPEMENT : même secteur obligatoire, scoring réel, clé de config exhaustive.
const grouping:ChallengeExerciseConfigLike={target:'15',rule:'all',visits:12,exerciseType:'grouping',groupingMin:15,groupingMax:20,groupingHits:2};
assert.equal(evaluateChallengeEntries([dart('D',18),dart('S',18),dart('T',20)],grouping).score,54);
assert.equal(evaluateChallengeEntries([dart('D',18),dart('T',20),dart('MISS')],grouping).score,0);
assert.equal(challengeObjectiveKeyTarget(grouping),'grouping-15-20-x2');
assert.equal(challengeObjectiveKeyTarget({...grouping,groupingHits:3}),'grouping-15-20-x3');

// Départage exercices : score, validation, série, meilleure volée.
const seqCfg:ChallengeExerciseConfigLike={target:'20',rule:'all',visits:5,exerciseType:'sequence',sequenceObjectives:['20','any-double','18','any-triple','bull'],sequenceScoreMode:'real'};
const rankRows:any[]=[
  {score:100,exerciseStats:{validationRate:80,bestValidatedVisitStreak:2,bestVisitPoints:60}},
  {score:100,exerciseStats:{validationRate:90,bestValidatedVisitStreak:1,bestVisitPoints:45}},
];
assert.equal(rankRows.slice().sort((a,b)=>compareChallengeRankRows(a,b,seqCfg))[0].exerciseStats.validationRate,90);
const rankRows2:any[]=[
  {score:100,exerciseStats:{validationRate:90,bestValidatedVisitStreak:2,bestVisitPoints:45}},
  {score:100,exerciseStats:{validationRate:90,bestValidatedVisitStreak:3,bestVisitPoints:30}},
];
assert.equal(rankRows2.slice().sort((a,b)=>compareChallengeRankRows(a,b,seqCfg))[0].exerciseStats.bestValidatedVisitStreak,3);

// Compétitions : la configuration d'exercice stockée reste l'autorité et l'override d'objectif ne la détruit pas.
const compRules:any={
  target:'grouping-15-20-x2', rule:'all', visits:12, exerciseType:'grouping', tieBreak:'exercise',
  exerciseConfig:{...grouping}, objectiveMode:'fixed', objectiveTargets:['grouping-15-20-x2'],
};
const reconstructed=challengeExerciseConfigFromRules(compRules,'20');
assert.equal(reconstructed.exerciseType,'grouping');
assert.equal(reconstructed.groupingMin,15);
assert.equal(reconstructed.groupingMax,20);
assert.equal(reconstructed.groupingHits,2);
assert.equal(reconstructed.visits,12);

// Intégration statique : Config, Play, compétitions, reprise/Undo et i18n doivent rester câblés.
const config=fs.readFileSync('src/pages/ChallengeConfig.tsx','utf8');
const play=fs.readFileSync('src/pages/ChallengePlay.tsx','utf8');
const create=fs.readFileSync('src/pages/TournamentCreate.tsx','utf8');
const matchPlay=fs.readFileSync('src/pages/TournamentMatchPlay.tsx','utf8');
const view=fs.readFileSync('src/pages/TournamentView.tsx','utf8');
const i18n=fs.readFileSync('src/i18n/configUiLiteralRegistry.ts','utf8');

for(const marker of ['custom-visits','grouping-presets','launch-preview']) assert.ok(config.includes(marker),`ChallengeConfig missing ${marker}`);
for(const marker of ['setLog(v=>v.slice(0,-1))','resumeRecord?.resume?.config','compareChallengeRankRows','leaderboardTarget:challengeObjectiveKeyTarget(cfg)']) assert.ok(play.includes(marker),`ChallengePlay missing ${marker}`);
for(const marker of ['challengeExerciseType','exerciseConfig: challengeExerciseConfig','challengePrimaryObjective','renderChallengeExerciseEditor','GROUPEMENT']) assert.ok(create.includes(marker),`TournamentCreate missing ${marker}`);
for(const marker of ['challengeExerciseConfigFromRules','tieBreak:exerciseType==="classic"']) assert.ok(matchPlay.includes(marker),`TournamentMatchPlay missing ${marker}`);
for(const marker of ['challengeExerciseConfigFromRules','compareChallengeRankRows','leaderboardTarget','challengeCompetitionExerciseType']) assert.ok(view.includes(marker),`TournamentView missing ${marker}`);
for(const marker of ['CHALLENGE_FINAL_FR_LITERALS','HORLOGE 1 → 20','GROUPEMENT','PROGRESSION PERSONNELLE']) assert.ok(i18n.includes(marker),`i18n registry missing ${marker}`);

console.log('✅ CHALLENGE FINAL V49 — moteurs, Undo/reprise, départage, compétitions, config et i18n OK');
