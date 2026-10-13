import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildChallengeExerciseCareer, challengeCareerConfigKey } from '../src/lib/challengeExerciseCareer.ts';
import { analyzeChallengeExercise, type ChallengeEntryLike, type ChallengeExerciseConfigLike } from '../src/lib/challengeExercises.ts';

const dart=(hit:any,segment?:number):ChallengeEntryLike=>({hit,...(segment?{segment}:{})});
const clock:ChallengeExerciseConfigLike={target:'1',rule:'all',visits:3,exerciseType:'clock',clockIncludeBull:false,clockScoreMode:'challenge'};
const statsA=analyzeChallengeExercise([
  dart('S'),dart('D'),dart('MISS'),
  dart('MISS'),dart('MISS'),dart('MISS'),
  dart('T'),dart('T'),dart('T'),
],clock);
const statsB=analyzeChallengeExercise([
  dart('S'),dart('S'),dart('S'),
  dart('D'),dart('MISS'),dart('MISS'),
  dart('MISS'),dart('MISS'),dart('MISS'),
],clock);
const key=challengeCareerConfigKey(clock).split('|v')[0];
const record=(id:string,playedAt:number,score:number,stats:any,user='u1',visits=3)=>({
  id,matchId:id,kind:'challenge',status:'finished',finishedAt:playedAt,
  game:{mode:'challenge',leaderboardTarget:key,visits,exerciseType:'clock'},
  summary:{finished:true,leaderboardTarget:key,visits},
  payload:{config:{...clock,leaderboardTarget:key,visits},stats:{players:[{id:'p1',userId:user,name:'Ninja',score,exerciseStats:stats}]}}
});

const career=buildChallengeExerciseCareer([
  record('m1',1000,20,statsA),
  record('m2',2000,15,statsB),
  record('other-user',3000,99,statsA,'u2'),
  record('other-config',4000,99,statsA,'u1',5),
],clock,{ids:['p1'],onlineUserIds:['u1'],name:'Ninja'});

assert.equal(career.matches,2);
assert.equal(career.bestScore,20);
assert.equal(career.recent.length,2);
assert.equal(career.strongestObjective?.label,'1');
assert.equal(career.weakestObjective?.label,'2');
assert.ok(career.averageValidationRate>0);

const withCurrent=buildChallengeExerciseCareer([
  record('m1',1000,20,statsA),
],clock,{ids:['p1'],onlineUserIds:['u1'],name:'Ninja'},{matchId:'m-current',playedAt:5000,score:33,exerciseStats:statsB});
assert.equal(withCurrent.matches,2);
assert.equal(withCurrent.bestScore,33);

const noDuplicate=buildChallengeExerciseCareer([
  record('m-current',5000,33,statsB),
],clock,{ids:['p1'],onlineUserIds:['u1'],name:'Ninja'},{matchId:'m-current',playedAt:5000,score:33,exerciseStats:statsB});
assert.equal(noDuplicate.matches,1);

const half:ChallengeExerciseConfigLike={target:'15',rule:'all',visits:2,exerciseType:'half-it',halfItStartScore:40,sequenceObjectives:['15','16']};
const halfStats=analyzeChallengeExercise([
  dart('MISS'),dart('MISS'),dart('MISS'),
  dart('S'),dart('MISS'),dart('MISS'),
],half);
const halfKey=challengeCareerConfigKey(half).split('|v')[0];
const halfCareer=buildChallengeExerciseCareer([{id:'h1',kind:'challenge',status:'finished',finishedAt:10,payload:{config:{...half,leaderboardTarget:halfKey},stats:{players:[{id:'p1',name:'Ninja',score:28,exerciseStats:halfStats}]}}}],half,{ids:['p1'],name:'Ninja'});
assert.equal(halfCareer.halfItCuts,1);
assert.equal(halfCareer.dangerObjective?.label,'15');
assert.equal(halfCareer.dangerObjective?.cuts,1);

const grouping:ChallengeExerciseConfigLike={target:'15',rule:'all',visits:1,exerciseType:'grouping',groupingMin:15,groupingMax:20,groupingHits:2};
const groupingStats=analyzeChallengeExercise([dart('D',18),dart('S',18),dart('MISS')],grouping);
const groupingKey=challengeCareerConfigKey(grouping).split('|v')[0];
const groupingCareer=buildChallengeExerciseCareer([{id:'g1',kind:'challenge',status:'finished',finishedAt:10,payload:{config:{...grouping,leaderboardTarget:groupingKey},stats:{players:[{id:'p1',name:'Ninja',score:54,exerciseStats:groupingStats}]}}}],grouping,{ids:['p1'],name:'Ninja'});
assert.equal(groupingCareer.topGroupingSector?.sector,18);
assert.equal(groupingCareer.groupingPoints,54);

const play=fs.readFileSync('src/pages/ChallengePlay.tsx','utf8');
for(const marker of ['RECORDS PERSISTANTS','HISTORIQUE DE L’EXERCICE','FORME RÉCENTE','ZONE LA PLUS DANGEREUSE','SECTEUR HISTORIQUE FORT'])assert.ok(play.includes(marker),`ChallengePlay missing V45 marker ${marker}`);

console.log('✅ CHALLENGE V45 — persistent exercise records, trends, objective weak/strong history and grouping history OK');
