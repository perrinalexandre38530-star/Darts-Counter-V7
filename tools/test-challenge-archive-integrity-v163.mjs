/** Contract fixtures mirror the objects persisted by ChallengePlay and ChallengeArcadePlay.
 * The app's private History V4 DB is NOT included in the source ZIP.
 */
import assert from 'node:assert/strict';
import {challengeArchiveItems,challengeRecordConfigKey,dedupeChallengeMatchSnapshots,summarizeChallengeArchive} from '../src/lib/challengeArchiveCore.ts';
import {buildChallengeArchiveReliability} from '../src/lib/challengeArchiveReliability.ts';
import {buildChallengeImpactDetails} from '../src/lib/challengePerformanceDetails.ts';
import {buildChallengeModeDiagnostics} from '../src/lib/challengeModeDiagnostics.ts';
import {buildChallengeRecordDetails} from '../src/lib/challengeInsightMetrics.ts';

const classic={exerciseType:'classic',target:'20',rule:'all',visits:5};
const exact={exerciseType:'arcade',catalogChallengeId:'perfect-line',catalogLine:20,catalogRounds:1,catalogVariant:'classic'};
function saved({id,config=classic,status='finished',players=[{id:'A',name:'Alex',score:8,darts:4,hitCount:3,accuracy:75,bestStreak:2}],entries=[],stateHits=[],updatedAt=1762800000000,finishedAt}={}){
 const arcade=config.exerciseType==='arcade';
 const summary={kind:'challenge',mode:'challenge',status,finished:status==='finished',perPlayer:players,rankings:players};
 return {id,matchId:id,kind:'challenge',mode:'challenge',sport:'darts',status,updatedAt,
  ...(finishedAt?{finishedAt}:{}),players:players.map(({id,name})=>({id,name})),
  game:{mode:'challenge',exerciseType:config.exerciseType,...(arcade?{catalogChallengeId:config.catalogChallengeId}:{}),target:config.target,rule:config.rule,visits:config.visits},
  summary,payload:{kind:'challenge',mode:'challenge',status,config,entries,state:{hits:stateHits},summary,stats:{players}},
  ...(status==='in_progress'?{resume:{config,state:{hits:stateHits,log:entries}}}:{})};
}
const some=(id)=>({pid:id,hit:'S',segment:20});
const original=saved({id:'same',status:'in_progress',entries:[some('A')],updatedAt:1762805000000});
const final=saved({id:'same',entries:[some('A'),some('A'),some('A'),{pid:'A',hit:'MISS',segment:null}],updatedAt:1762801000000});
assert.equal(dedupeChallengeMatchSnapshots([original,final]).length,1);
assert.equal(dedupeChallengeMatchSnapshots([original,final])[0].status,'finished');
const summaryOnly={...final,payload:{config:classic},updatedAt:1762809999999};
assert.equal(dedupeChallengeMatchSnapshots([summaryOnly,final])[0].payload.entries.length,4,
 'keep the richer completed snapshot even if a lightweight backup was stored later');
assert.equal(challengeArchiveItems([original,final],{playerId:'A'}).length,1);
const completed=challengeArchiveItems([original,final],{playerId:'A'});
assert.equal(summarizeChallengeArchive(completed).completed,1);
assert.equal(summarizeChallengeArchive(completed).inProgress,0);

const unknown1=saved({id:'unknown-A',config:{exerciseType:'classic'}});
const unknown2=saved({id:'unknown-B',config:{exerciseType:'classic'}});
for(const item of [unknown1,unknown2]){delete item.game.target;delete item.game.rule;delete item.game.visits;}
assert.notEqual(challengeRecordConfigKey(unknown1),challengeRecordConfigKey(unknown2));
const unknownItems=challengeArchiveItems([unknown1,unknown2],{playerId:'A'});
assert.equal(unknownItems[0].configLabel,'CONFIGURATION NON DOCUMENTÉE');
assert.equal(summarizeChallengeArchive(unknownItems).byConfig.length,2);

const arcHits=[
 {pid:'A',zone:'D',segment:20},
 {pid:'B',zone:'G',segment:19},
 {pid:'A',zone:'G',segment:20},
 {pid:'B',zone:'P',segment:19},
 {pid:'A',zone:'T',segment:20},
 {pid:'A',zone:'P',segment:20},
 {pid:'A',zone:'BULL',segment:null},
 {pid:'A',zone:'DBULL',segment:null},
];
const classicS=arcHits.map(row=>({pid:row.pid,hit:row.zone==='G'||row.zone==='P'?'S':row.zone,segment:row.segment}));
const two=[{id:'A',name:'Alex',score:600,darts:6,hitCount:6,accuracy:100,bestStreak:6},
{id:'B',name:'Beth',score:200,darts:2,hitCount:2,accuracy:100,bestStreak:2}];
const arcade=saved({id:'multi-arcade',config:exact,players:two,entries:classicS,stateHits:arcHits});
const onlyA=challengeArchiveItems([arcade],{playerId:'A'});
const onlyB=challengeArchiveItems([arcade],{playerId:'B'});
assert.equal(onlyA.length,1);
assert.equal(onlyA[0].darts,6);
assert.equal(onlyB[0].darts,2);
const aImpacts=buildChallengeImpactDetails(onlyA);
const bImpacts=buildChallengeImpactDetails(onlyB);
assert.equal(aImpacts.byZone.G,1,'arcade original G survives lossy S snapshot');
assert.equal(aImpacts.byZone.P,1,'arcade original P survives lossy S snapshot');
assert.equal(aImpacts.byZone.D,1);
assert.equal(aImpacts.byZone.T,1);
assert.equal(bImpacts.byZone.G,1);
assert.equal(bImpacts.byZone.P,1);
assert.equal(bImpacts.byZone.D,0,'do not count another player');
assert.equal(buildChallengeModeDiagnostics(onlyA,'arcade:perfect-line').darts,6);
assert.equal(buildChallengeModeDiagnostics(onlyB,'arcade:perfect-line').darts,2);
const arAudit=buildChallengeArchiveReliability(onlyA);
assert.equal(arAudit.withJournal,1);
assert.equal(arAudit.dartCountConflicts,0);

const dateIso=saved({id:'date',entries:[some('A')]});
dateIso.updatedAt='2026-11-10T20:00:00.000Z';
assert.equal(challengeArchiveItems([dateIso],{playerId:'A'})[0].playedAt,Date.parse(dateIso.updatedAt));
const oldSec=saved({id:'seconds',entries:[some('A')],updatedAt:1762800000});
assert.equal(challengeArchiveItems([oldSec],{playerId:'A'})[0].playedAt,1762800000000);

const twoHomonyms=saved({id:'homonyms',players:[{id:'1',name:'Alex',score:100},{id:'2',name:'Alex',score:999}]});
twoHomonyms.players=[{id:'legacy-profile',name:'Alex'}];
assert.equal(challengeArchiveItems([twoHomonyms],{playerId:'legacy-profile'}).length,0,
 'ambiguous display name cannot reassign someone else’s stats');

const inProgress=saved({id:'not-finished',status:'in_progress',config:exact,players:two,stateHits:arcHits,entries:classicS});
assert.equal(buildChallengeArchiveReliability(challengeArchiveItems([inProgress],{playerId:'A'})).finished,0);
assert.equal(buildChallengeRecordDetails(challengeArchiveItems([inProgress,arcade],{playerId:'A'}),challengeRecordConfigKey(arcade),'min').played,1);

const mismatch=saved({id:'mismatch',entries:[some('A'),some('A')]});
const summaryNoLog=saved({id:'summary-only'});
const legacyWithoutSummary={...summaryNoLog,id:'no-summary',matchId:'no-summary',summary:{kind:'challenge',mode:'challenge',finished:true},players:[{id:'A',name:'Alex'}],payload:{config:classic}};
const coverage=buildChallengeArchiveReliability(challengeArchiveItems([mismatch,summaryNoLog,legacyWithoutSummary],{playerId:'A'}));
assert.equal(coverage.dartCountConflicts,1);
assert.equal(coverage.summaryOnly,1);
assert.equal(coverage.withJournal,1);
// A row without a reliable player summary may be excluded from the scoped view.
assert.equal(coverage.finished,3);
assert.equal(coverage.withoutDetail,1);
assert.equal(coverage.missingScores,1,'a roster-only legacy match has no documented score');
const withoutMetric=challengeArchiveItems([legacyWithoutSummary],{playerId:'A'});
assert.equal(withoutMetric[0].scoreKnown,false);
assert.equal(summarizeChallengeArchive(withoutMetric).completed,1,'preserve the finished match');
assert.equal(summarizeChallengeArchive(withoutMetric).byConfig.length,0,'no fabricated 0-point record');
assert.equal(buildChallengeRecordDetails(withoutMetric,withoutMetric[0].configKey,'max').played,0);
console.log('✅ CHALLENGE V163: snapshots, aliases, exact per-player G/P, legacy configs, timestamps, privacy, coverage, records');
