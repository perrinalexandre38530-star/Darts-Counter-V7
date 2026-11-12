import assert from 'node:assert/strict';
import {challengeArchiveItems,challengeRecordConfigKey} from '../src/lib/challengeArchiveCore.ts';
import {buildChallengeArchiveAudit} from '../src/lib/challengeArchiveAudit.ts';

const player={id:'P1',name:'Nom privé',score:95,darts:9,hitCount:7};
const other={id:'P2',name:'Autre joueur',score:800,darts:3,hitCount:3};
const cfg={exerciseType:'arcade',catalogChallengeId:'perfect-line',catalogVariant:'classic',catalogLine:20,catalogRounds:1};
function rec(id,status='finished',players=[player],entries=[],config=cfg){
 const summary={kind:'challenge',mode:'challenge',finished:status==='finished',perPlayer:players};
 return {id,matchId:id,kind:'challenge',mode:'challenge',status,createdAt:1762800000000,
  summary,game:{exerciseType:config.exerciseType,catalogChallengeId:config.catalogChallengeId},
  players:players.map(({id,name})=>({id,name})),payload:{config,summary,state:{hits:entries}}};
}
const hits=[{pid:'P1',zone:'D',segment:20},{pid:'P2',zone:'G',segment:3},{pid:'P1',zone:'G',segment:20},{pid:'P1',zone:'T',segment:20}];
const base=rec('valid', 'finished',[player,other],hits);
const hidden=rec('ongoing','in_progress',[player],hits);
const invalid=rec('no-darts','finished',[{id:'P1',name:'Nom privé',score:120}],[]);
const old=rec('old','finished',[{id:'P1',name:'Nom privé',score:150,darts:11}],[],{exerciseType:'classic',target:'20',rule:'all',visits:5});
const rows=challengeArchiveItems([base,hidden,invalid,old],{playerId:'P1'});
const audit=buildChallengeArchiveAudit(rows,[base,{...base,updatedAt:1762800002000},hidden,invalid,old]);
assert.equal(audit.total,4);
assert.equal(audit.finished,3);
assert.equal(audit.inProgress,1);
assert.equal(audit.recordEligible,2); // shortest-path score requires documented darts
assert.equal(audit.notEligible,1);
assert.equal(audit.duplicateSnapshots,1);
assert.equal(audit.journalVerified,1);
assert.ok(audit.problems.some(p=>p.code==='NO_DARTS'&&p.count===1));
assert.equal(challengeArchiveItems([base],{playerId:'P2'}).length,1);
const str=JSON.stringify(audit);
for(const secret of ['Nom privé','Autre joueur','P1','P2','valid','ongoing','no-darts',String(challengeRecordConfigKey(base))])assert.ok(!str.includes(secret),'audit must not leak personal or match data: '+secret);
assert.deepEqual(buildChallengeArchiveAudit([]),{schema:'mss-challenge-audit-v1',scope:'selected-challenge-and-profile',total:0,finished:0,inProgress:0,recordEligible:0,notEligible:0,duplicateSnapshots:0,journalVerified:0,summaryOnly:0,withoutDetail:0,problems:[],eligibleByMode:[]});
assert.deepEqual(rows.map(r=>r.id),['valid','ongoing','no-darts','old']); // read-only; order deterministic
console.log('✅ CHALLENGE V108 — read-only anonymized data audit, profile isolation, record eligibility, empty case');
