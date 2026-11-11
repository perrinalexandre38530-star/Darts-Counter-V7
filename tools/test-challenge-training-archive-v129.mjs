import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isChallengeMatchRecord,challengeArchiveItems,summarizeChallengeArchive,challengeRecordModeId,challengeRecordConfigKey} from '../src/lib/challengeArchiveCore.ts';

const rec=(id,modeId,at,score,darts,config={},status='finished',player='ninja')=>({
 id,matchId:id,kind:'challenge',mode:'challenge',sport:'darts',status,updatedAt:at,
 game:{mode:'challenge',exerciseType:modeId==='perfect-line'?'arcade':modeId, catalogChallengeId:modeId==='perfect-line'?'perfect-line':undefined},
 summary:{finished:status==='finished',perPlayer:[{id:player,name:'Ninja',score,darts,accuracy:70,bestStreak:3}]},
 payload:{config:{exerciseType:modeId==='perfect-line'?'arcade':modeId,catalogChallengeId:modeId==='perfect-line'?'perfect-line':undefined,
  leaderboardTarget: modeId==='perfect-line'?'arcade-perfect-line-n20-a':'classic-20-all-5',...config}},
});
const rows=[
 rec('classic-1','classic',100,47,15),
 rec('classic-2','classic',200,95,15),
 rec('line-1','perfect-line',400,600,12),
 rec('line-2','perfect-line',500,600,9),
 rec('line-running','perfect-line',600,200,3,{},'in_progress'),
 rec('other-profile','classic',700,999,30,{},'finished','other'),
 {id:'x01',mode:'x01',kind:'x01',summary:{title:'challenge yourself'},status:'finished'},
 {id:'training',mode:'training_challenges',kind:'training',status:'finished'},
];
assert.equal(isChallengeMatchRecord(rows[0]),true);
assert.equal(isChallengeMatchRecord({mode:'challenge_solo'}),true,'legacy solo challenge recognized');
assert.equal(isChallengeMatchRecord(rows[6]),false);
assert.equal(isChallengeMatchRecord(rows[7]),false);
assert.equal(challengeRecordModeId(rows[2]),'arcade:perfect-line');
assert.notEqual(challengeRecordConfigKey(rows[2]),challengeRecordConfigKey(rows[0]));
assert.notEqual(challengeRecordConfigKey(rows[0]),challengeRecordConfigKey(rec('visit-different','classic',100,30,15,{visits:30})), 'identical target but different rules must not share records');
const items=challengeArchiveItems(rows,{playerId:'ninja'});
assert.equal(items.length,5,'only the five sessions for this player');
const sum=summarizeChallengeArchive(items);
assert.equal(sum.completed,4);
assert.equal(sum.inProgress,1);
assert.equal(sum.byConfig.length,2);
assert.equal(sum.byConfig.find(g=>g.goal==='min')?.best.id,'line-2','shortest finished path');
assert.equal(sum.byConfig.find(g=>g.goal==='max')?.best.id,'classic-2','highest score');
assert.equal(sum.latest[0].id,'line-2');
assert.equal(sum.ongoing[0].id,'line-running');
const noIdentity=challengeArchiveItems(rows,{playerId:'not-ninja'});
assert.equal(noIdentity.length,0,'do not mix homonyms or profiles');
const ownMode=challengeArchiveItems(rows,{playerId:'ninja',modeId:'arcade:perfect-line'});
assert.equal(ownMode.length,3);
assert.equal(rows[0].summary.perPlayer[0].score,47,'read-only source');

const history=fs.readFileSync('src/pages/HistoryPage.tsx','utf8');
assert.match(history,/rawAllItems\s*=\s*useMemo\(\(\)\s*=>\s*dedupe\(items\)\.filter\(\(e\)\s*=>\s*!isChallengeHistoryEntry\(e\)\)/,
 'Challenge cards must be hidden only at history presentation');
assert.match(history,/isChallengeHistoryEntry\(/,'legacy recognition retained');
const cfg=fs.readFileSync('src/pages/ChallengeConfig.tsx','utf8');
assert.ok(cfg.includes('RELEVER LE DÉFI')&&cfg.includes('RETOUR AUX DÉFIS'),'two-step card UX');
assert.ok(cfg.includes('<ChallengeInsightsPage')&&cfg.includes("setInsightView('stats')")&&cfg.includes("setInsightView('records')"),'personal stats and record pages replace inline sheet');
const stats=fs.readFileSync('src/pages/StatsHub.tsx','utf8');
assert.ok(stats.includes('<ChallengeTrainingCard'),'training link');
const arc=fs.readFileSync('src/pages/ChallengeArcadePlay.tsx','utf8');
assert.ok(arc.includes('History.upsert'),'new game scores must keep canonical persistence');
const play=fs.readFileSync('src/pages/ChallengePlay.tsx','utf8');
assert.ok(play.includes('History.upsert'),'legacy scoring persistence preserved');
console.log('✅ CHALLENGE V129 — archive separation / 2-step chooser / records / resume / legacy preservation');
