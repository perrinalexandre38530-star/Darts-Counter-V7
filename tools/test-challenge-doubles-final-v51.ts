import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  DOUBLES_8_TARGETS,
  analyzeChallengeExercise,
  challengeObjectiveKeyTarget,
  challengeOnlineTargetLabel,
  evaluateChallengeEntries,
  maxChallengePointsPerDart,
  normalizedDoublesTargets,
  objectiveForVisit,
  type ChallengeEntryLike,
  type ChallengeExerciseConfigLike,
} from '../src/lib/challengeExercises.ts';
import { buildChallengeExerciseCareer } from '../src/lib/challengeExerciseCareer.ts';
import { buildChallengeStatsProgression } from '../src/lib/challengeStatsProgression.ts';

const d=(segment:number):ChallengeEntryLike=>({hit:'D',segment});
const miss=():ChallengeEntryLike=>({hit:'MISS'});

const official:ChallengeExerciseConfigLike={
  target:'20',rule:'double',visits:25,exerciseType:'doubles8',
  doublesTargets:[...DOUBLES_8_TARGETS],doublesBonusTarget:20,
};

assert.deepEqual(normalizedDoublesTargets(official),[20,18,16,12,10,8,4,2]);
assert.equal(official.visits,25);
assert.equal(objectiveForVisit(official,0),'double:20');
assert.equal(objectiveForVisit(official,2),'double:20');
assert.equal(objectiveForVisit(official,3),'double:18');
assert.equal(objectiveForVisit(official,23),'double:2');
assert.equal(objectiveForVisit(official,24),'bonus-double:20');
assert.equal(challengeObjectiveKeyTarget(official),'doubles8-bonus-d20');
assert.equal(challengeOnlineTargetLabel(challengeObjectiveKeyTarget(official)),'8 DOUBLES');
assert.equal(maxChallengePointsPerDart(official),50,'bonus dart can score 50 points');

// Barème par volée : 1 / 2 / 3 touches = 10 / 30 / 100 points.
assert.equal(evaluateChallengeEntries([d(20),miss(),miss()],official).score,10);
assert.equal(evaluateChallengeEntries([d(20),d(20),miss()],official).score,30);
assert.equal(evaluateChallengeEntries([d(20),d(20),d(20)],official).score,100);
assert.equal(evaluateChallengeEntries([d(5),miss(),miss()],official).score,0,'wrong double must never score');

// Partie parfaite officielle : 24 volées normales à 100 + bonus parfait à 150 = 2550.
const perfect:ChallengeEntryLike[]=[];
for(const target of DOUBLES_8_TARGETS){
  for(let volley=0;volley<3;volley++) perfect.push(d(target),d(target),d(target));
}
perfect.push(d(20),d(20),d(20));
const perfectEval=evaluateChallengeEntries(perfect,official);
assert.equal(perfect.length,75);
assert.equal(perfectEval.score,2550);
const perfectStats=analyzeChallengeExercise(perfect,official);
assert.equal(perfectStats.doublesRegularScore,2400);
assert.equal(perfectStats.doublesBonusScore,150);
assert.equal(perfectStats.doublesRegularHits,72);
assert.equal(perfectStats.doublesRegularDarts,72);
assert.equal(perfectStats.doublesBonusHits,3);
assert.equal(perfectStats.doublesBonusDarts,3);
assert.equal(perfectStats.doublesTargetStats?.['20']?.hits,9,'bonus hits must not pollute D20 regular stats');
assert.equal(perfectStats.doublesTargetStats?.['20']?.darts,9);
assert.equal(perfectStats.doublesTargetStats?.['20']?.points,300);
assert.equal(perfectStats.doublesTargetStats?.['20']?.accuracy,100);

// Variante personnalisée : 3 doubles => 9 volées normales + 1 bonus.
const custom:ChallengeExerciseConfigLike={
  target:'20',rule:'double',visits:10,exerciseType:'doubles8',
  doublesTargets:[20,16,5],doublesBonusTarget:16,
};
assert.deepEqual(normalizedDoublesTargets(custom),[20,16,5]);
assert.equal(objectiveForVisit(custom,0),'double:20');
assert.equal(objectiveForVisit(custom,2),'double:20');
assert.equal(objectiveForVisit(custom,3),'double:16');
assert.equal(objectiveForVisit(custom,5),'double:16');
assert.equal(objectiveForVisit(custom,6),'double:5');
assert.equal(objectiveForVisit(custom,8),'double:5');
assert.equal(objectiveForVisit(custom,9),'bonus-double:16');
assert.equal(challengeObjectiveKeyTarget(custom),'doubles8-custom-20.16.5-bonus-d16');
assert.equal(challengeOnlineTargetLabel(challengeObjectiveKeyTarget(custom)),'DOUBLES PERSO');
assert.notEqual(challengeObjectiveKeyTarget(custom),challengeObjectiveKeyTarget(official));
assert.deepEqual(normalizedDoublesTargets({...custom,doublesTargets:[20,20,16,5,16]}),[20,16,5],'duplicates must be removed while preserving route order');

// Statistiques : la phase principale et le bonus restent strictement séparés.
const customLog:ChallengeEntryLike[]=[];
customLog.push(d(20),d(20),miss()); // 30 points, 2/3
customLog.push(miss(),miss(),miss());
customLog.push(d(20),miss(),miss()); // 10 points, 1/3
for(let i=0;i<6;i++) customLog.push(miss(),miss(),miss()); // D16 + D5
customLog.push(d(16),d(16),d(16)); // bonus = 150
const customEval=evaluateChallengeEntries(customLog,custom);
assert.equal(customEval.score,190);
const customStats=analyzeChallengeExercise(customLog,custom);
assert.equal(customStats.doublesRegularScore,40);
assert.equal(customStats.doublesBonusScore,150);
assert.equal(customStats.doublesRegularHits,3);
assert.equal(customStats.doublesBonusHits,3);
assert.equal(customStats.doublesTargetStats?.['20']?.hits,3);
assert.equal(customStats.doublesTargetStats?.['20']?.darts,9);
assert.equal(customStats.doublesTargetStats?.['20']?.accuracy,33.3);
assert.equal(customStats.doublesTargetStats?.['16']?.hits,0,'bonus D16 must not count in regular D16 target stats');
assert.equal(customStats.doublesTargetStats?.['16']?.darts,9);


// Historique / progression : la volée bonus ne doit jamais devenir le « double fort ».
const bonusOnlyLog:ChallengeEntryLike[]=[];
for(let i=0;i<9;i++) bonusOnlyLog.push(miss(),miss(),miss());
bonusOnlyLog.push(d(16),d(16),d(16));
const bonusOnlyStats=analyzeChallengeExercise(bonusOnlyLog,custom);
const career=buildChallengeExerciseCareer([],custom,{name:'TEST'}, {playedAt:1,score:150,exerciseStats:bonusOnlyStats});
assert.ok(career.strongestObjective);
assert.ok(!String(career.strongestObjective?.objective||'').startsWith('bonus-double:'),'career strength must exclude bonus objective');
const progression=buildChallengeStatsProgression([
  {id:'p1',at:1,score:10,exerciseType:'doubles8',exerciseStats:{validationRate:25,objectiveStats:{'double:20':{attempts:3,validated:1},'bonus-double:16':{attempts:1,validated:0}}}},
  {id:'p2',at:2,score:160,exerciseType:'doubles8',exerciseStats:{validationRate:50,objectiveStats:{'double:20':{attempts:3,validated:1},'bonus-double:16':{attempts:1,validated:1}}}},
] as any);
assert.equal(progression.currentStrength?.key,'double:20');
assert.equal(progression.bestObjectiveProgress,null,'bonus improvement must not masquerade as double progression');

// Contrats UI : saisie à 2 touches et statistiques spécialisées dans Arcade + Training.
const arcade=fs.readFileSync('src/pages/ChallengePlay.tsx','utf8');
const training=fs.readFileSync('src/training/modes/challenges/ChallengesPlay.tsx','utf8');
const config=fs.readFileSync('src/pages/ChallengeConfig.tsx','utf8');
const i18n=fs.readFileSync('src/i18n/configUiLiteralRegistry.ts','utf8');
const statsHub=fs.readFileSync('src/pages/StatsHub.tsx','utf8');
for(const marker of ['className="D" disabled={done} onClick={addObjectiveDoubleHit}','<span>TOUCHÉ</span>','<b>MISS</b><span>RATÉ</span>','TOUCHÉS','SCORE PHASE','SCORE BONUS','PERFORMANCE PAR CIBLE','DOUBLE FORT','DOUBLE À TRAVAILLER']) {
  assert.ok(arcade.includes(marker),`ChallengePlay missing doubles final marker: ${marker}`);
}
for(const marker of ['DoublesObjectivePad','ANNULER LA DERNIÈRE FLÉCHETTE','perDoubleAttempts','regularPoints','bonusHits','doublesBreakdown']) {
  assert.ok(training.includes(marker),`Training ChallengesPlay missing doubles final marker: ${marker}`);
}
for(const marker of ['doublesTargets','doublesBonusTarget','DOUBLES À JOUER','PERSONNALISÉ']) {
  assert.ok(config.includes(marker),`ChallengeConfig missing doubles config marker: ${marker}`);
}
for(const marker of ['8 DOUBLES · 9 FLÉCHETTES','SCORE PHASE','RÉUSSITE DOUBLES','ANNULER LA DERNIÈRE FLÉCHETTE']) {
  assert.ok(i18n.includes(marker),`i18n registry missing doubles marker: ${marker}`);
}
for(const marker of ['DOUBLES PERSO','DOUBLE HISTORIQUE FORT','BONUS CUMULÉ','bonus-double:']) {
  assert.ok(statsHub.includes(marker),`StatsHub missing doubles marker: ${marker}`);
}

console.log('✅ CHALLENGE DOUBLES FINAL V51 — scoring, bonus, variantes, analytics, saisie Arcade/Training et i18n OK');
