import assert from 'node:assert/strict';
import fs from 'node:fs';
import { challengeObjectiveKeyTarget, type ChallengeExerciseConfigLike } from '../src/lib/challengeExercises.ts';

const configs:ChallengeExerciseConfigLike[]=[
  {target:'1',rule:'all',visits:20,exerciseType:'clock',clockIncludeBull:false,clockScoreMode:'challenge'},
  {target:'1',rule:'all',visits:21,exerciseType:'clock',clockIncludeBull:true,clockScoreMode:'real'},
  {target:'15',rule:'all',visits:9,exerciseType:'half-it',halfItStartScore:40,sequenceObjectives:['15','16','any-double','17','18','any-triple','19','20','bull']},
  {target:'20',rule:'all',visits:5,exerciseType:'sequence',sequenceScoreMode:'real',sequenceObjectives:['20','any-double','18','any-triple','bull']},
  {target:'15',rule:'all',visits:10,exerciseType:'grouping',groupingMin:15,groupingMax:20,groupingHits:2},
];
const keys=configs.map(challengeObjectiveKeyTarget);
assert.equal(new Set(keys).size,keys.length,'exercise leaderboard targets must stay unique by configuration');
assert.ok(keys.some(key=>key.startsWith('grouping-15-20-x2')));
assert.ok(keys.some(key=>key.startsWith('halfit-40-')));

const hub=fs.readFileSync('src/pages/StatsHub.tsx','utf8');
for(const marker of [
  'leaderboardTarget',
  'exercisePortfolio',
  'FICHE JOUEUR · CHALLENGE',
  'RECORDS DES EXERCICES',
  'RECORDS PERSISTANTS',
  'OBJECTIF HISTORIQUE FORT',
  'ZONE LA PLUS DANGEREUSE',
  'SECTEUR FORT',
  'FORME RÉCENTE · VALIDATION',
]) assert.ok(hub.includes(marker),`StatsHub missing V46 marker ${marker}`);

assert.ok(hub.includes('row?.leaderboardTarget || row?.target'), 'Challenge stats config key must use leaderboardTarget before legacy target');
assert.ok(hub.includes("row.exerciseType !== 'classic' && row.exerciseStats"), 'exercise career must be based on persisted exerciseStats');

console.log('✅ CHALLENGE EXERCISES V46 — global player records, exact exercise configs and persistent exercise career UI OK');
