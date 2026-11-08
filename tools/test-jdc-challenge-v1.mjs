import assert from 'node:assert/strict';
import { JDC_MAX_SCORE, JDC_TOTAL_DARTS, JDC_TOTAL_VISITS, jdcObjectiveForDart, objectiveForVisit, exerciseTitle, challengeObjectiveKeyTarget, evaluateChallengeEntries, analyzeChallengeExercise } from '../src/lib/challengeExercises.ts';
const cfg={exerciseType:'jdc',target:'10',rule:'all',visits:19};
const hit=(hit,segment)=>({hit,...(segment===undefined?{}:{segment})});
assert.equal(JDC_TOTAL_DARTS,57);assert.equal(JDC_TOTAL_VISITS,19);assert.equal(JDC_MAX_SCORE,3380);
assert.equal(exerciseTitle(cfg),'LE JDC CHALLENGE');assert.equal(challengeObjectiveKeyTarget(cfg),'jdc-challenge-v1');
assert.deepEqual([0,17,18,19,37,38,39,56].map(i=>jdcObjectiveForDart(i).label),['10','15','D1','D2','D20','BULL 50','15','20']);
assert.equal(objectiveForVisit(cfg,0),'jdc-sector:10');assert.equal(objectiveForVisit(cfg,6),'jdc-run:D1→D3');assert.equal(objectiveForVisit(cfg,12),'jdc-run:D19→BULL 50');assert.equal(objectiveForVisit(cfg,13),'jdc-sector:15');
const ideal=[];
for(let i=0;i<57;i++){
 const obj=jdcObjectiveForDart(i);
 if(obj.hit==='sector')ideal.push(hit(['S','D','T'][i%3],obj.sector));
 else if(obj.hit==='double')ideal.push(hit('D',obj.sector));
 else ideal.push(hit('50'));
}
let res=evaluateChallengeEntries(ideal,cfg);
assert.equal(res.score,3380);
assert.deepEqual(res.visitScores.slice(0,6),[160,166,172,178,184,190]);
assert.deepEqual(res.visitScores.slice(6,13),[150,150,150,150,150,150,200]);
assert.deepEqual(res.visitScores.slice(13),[190,196,202,208,214,220]);
let analytics=analyzeChallengeExercise(ideal,cfg);
assert.deepEqual(analytics.jdcPhaseScores,[1050,1100,1230]);
assert.equal(analytics.jdcShanghaiCount,12);assert.equal(analytics.jdcDoubleHits,20);assert.equal(analytics.jdcBullHits,1);
assert.equal(analytics.completedVisits,19);assert.equal(analytics.perfectVisits,19);
// Wrong segment/wrong multiplier scores nothing; phase-2 throws are per dart, not a single double per visit.
const flawed=ideal.map(x=>({...x}));flawed[0]=hit('T',11);flawed[18]=hit('D',20);flawed[19]=hit('D',1);flawed[38]=hit('25');
res=evaluateChallengeEntries(flawed,cfg);
assert.equal(res.entrySuccessful[0],false);assert.equal(res.entrySuccessful[18],false);assert.equal(res.entrySuccessful[19],false);assert.equal(res.entrySuccessful[38],false);
assert.equal(res.visitScores[0],50); // D10 + T10 (no Shanghai)
assert.equal(res.visitScores[6],50);
assert.equal(res.visitScores[12],100); // D19, D20, no Bull
assert.equal(res.score,3380-(160-50)-100-100);
// Only actual 50 Bull is worth +100.
assert.equal(evaluateChallengeEntries([...ideal.slice(0,38),hit('25'),...ideal.slice(39)],cfg).score,3280);
// A Shanghai is only awarded when all 3 darts are played in S,D,T and hit the designated sector.
assert.equal(evaluateChallengeEntries([hit('S',10),hit('D',10)],cfg).score,30);
assert.equal(evaluateChallengeEntries([hit('S',10),hit('D',10),hit('S',10)],cfg).score,40);
assert.equal(evaluateChallengeEntries([hit('S',10),hit('D',10),hit('T',10)],cfg).score,160);
assert.equal(evaluateChallengeEntries([hit('S',10),hit('D',10),hit('T',11)],cfg).score,30);
// Previous doubles mode retains its own scoring.
const doublesCfg={target:'20',rule:'double',visits:25,exerciseType:'doubles8'};
assert.equal(evaluateChallengeEntries([hit('D',20),hit('D',20),hit('D',20)],doublesCfg).score,100);
assert.equal(evaluateChallengeEntries([hit('D',18),hit('MISS'),hit('MISS')],doublesCfg).score,0);
console.log('JDC challenge: phases, targets, max 3380, Shanghai, Bull, history analytics, non-regression DOUBLES: OK');
