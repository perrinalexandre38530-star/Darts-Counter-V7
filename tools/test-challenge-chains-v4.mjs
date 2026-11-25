import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {onRequest} from '../functions/api/challenge/leaderboard/[[path]].ts';
import {CHAIN_KEYS, chainConfigKey, chainOnlineTarget, chainOnlinePerformances} from '../src/lib/challengeChains.ts';
import {chainDetailJournal} from '../src/lib/challengeChainDetail.ts';
import {chainSubmissionBatch,CHAIN_ONLINE_BATCH_SIZE} from '../src/lib/challengeChainSubmission.ts';
import {CHAIN_UI_TRANSLATIONS,localizedChainRule} from '../src/i18n/challengeChainTranslations.ts';
const config={chainVariant:'hybrid',chainFormat:'rounds',chainDarts:6};
const entries=[{zone:'T',segment:20},{zone:'T',segment:20},{zone:'MISS',segment:null},{zone:'G',segment:5},{zone:'P',segment:5},{zone:'DBULL',segment:null}];
const payload={config,entries,matchId:'m1',keys:['T20','T','HIT','S','S5','50','BULL','25'],displayName:'Test',score:99999};
assert.equal(chainSubmissionBatch(payload)[0].score,2);
const evidence=chainSubmissionBatch(payload)[0].stats;
assert.deepEqual(evidence.entries.map(e=>e.hit),['T','T','MISS','S','S','50']);
assert.deepEqual(chainDetailJournal(evidence,6,'T20').map(e=>e.current),[1,2,0,0,0,0]);
assert.deepEqual(chainDetailJournal(evidence,6,'HIT').map(e=>e.current),[1,2,0,1,2,3]);
assert.equal(chainDetailJournal({chainStats:evidence.chainStats},6,'T20'),null);
assert.equal(chainDetailJournal(evidence,7,'T20'),null);
assert.equal(chainDetailJournal({entries:[{zone:'T',segment:21}]},1,'T20'),null);
assert.throws(()=>chainSubmissionBatch({...payload,entries:entries.slice(0,5),config:{...config,chainEnded:true}}));
assert.throws(()=>chainSubmissionBatch({...payload,entries:[...entries,{zone:'T',segment:20}]}));
assert.throws(()=>chainSubmissionBatch({...payload,entries:[...entries.slice(0,5),{zone:'T',segment:21}]}));
assert.throws(()=>chainSubmissionBatch({...payload,keys:['S21']}));
assert.throws(()=>chainSubmissionBatch({...payload,keys:['S','S']}));
assert.throws(()=>chainSubmissionBatch({...payload,keys:CHAIN_KEYS}));
assert.throws(()=>chainSubmissionBatch({...payload,config:{...config,chainVariant:'triples'},keys:['HIT']}));
assert.throws(()=>chainSubmissionBatch({...payload,config:{chainVariant:'hybrid',chainFormat:'free'}}));
assert.equal(chainSubmissionBatch({...payload,config:{chainVariant:'hybrid',chainFormat:'free',chainEnded:true}})[0].darts,6);
assert.equal(chainOnlinePerformances(entries.slice(0,5),{...config,chainEnded:true}).length,0);
assert.equal(Object.keys(CHAIN_UI_TRANSLATIONS).length,22);
for(const [lang,dict] of Object.entries(CHAIN_UI_TRANSLATIONS)){assert.equal(Object.keys(dict).length,23);assert.ok(Object.values(dict).every(Boolean),lang);assert.ok(localizedChainRule(lang,config).includes('67'));}
const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../cloudflare/challenge-leaderboard-d1.sql',import.meta.url),'utf8'));
let failBatch=false;
const db={prepare(sql){return {bind(...args){const named=Object.fromEntries(args.map((a,i)=>['?'+(i+1),a]));const stmt=sqlite.prepare(sql);return {first:async()=>stmt.get(named),all:async()=>({results:stmt.all(named)}),run:async()=>stmt.run(named)};}};},async batch(stmts){sqlite.exec('BEGIN');try{for(let i=0;i<stmts.length;i++){await stmts[i].run();if(failBatch&&i===0){failBatch=false;throw new Error('simulated transaction failure');}}sqlite.exec('COMMIT');}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
const files=new Map();const bucket={async put(k,v){files.set(k,v);},async delete(k){files.delete(k);},async get(k){return files.has(k)?{json:async()=>JSON.parse(files.get(k))}:null;}};
const env={CHALLENGE_DB:db,USER_DATA_BUCKET:bucket,SUPABASE_URL:'https://test.invalid',SUPABASE_ANON_KEY:'test'};
const orig=globalThis.fetch;globalThis.fetch=async url=>{if(String(url).endsWith('/auth/v1/user'))return Response.json({id:'user1'});return Response.json([]);};
async function request(body,token=true){const response=await onRequest({request:new Request('https://local.test/api/challenge/leaderboard/chain-submit',{method:'POST',headers:token?{authorization:'Bearer test'}:{},body:JSON.stringify(body)}),env,params:{path:['chain-submit']}});return {status:response.status,data:await response.json()};}
const count=()=>sqlite.prepare('SELECT count(*) AS n FROM challenge_best_scores').get().n;
try{
 const statusResponse=await onRequest({request:new Request('https://local.test/api/challenge/leaderboard/status'),env,params:{path:['status']}});
 const status=await statusResponse.json();assert.equal(status.chainSubmitReady,true);assert.equal(status.chainDetailJournalVersion,1);
 assert.equal((await request(payload,false)).status,401);
 assert.equal((await request({...payload,expectedUserId:'other-user'})).status,403);
 assert.equal(count(),0);
 assert.equal((await request({...payload,entries:entries.slice(0,4)})).status,400);
 assert.equal(count(),0);
 for(let i=0;i<CHAIN_KEYS.length;i+=CHAIN_ONLINE_BATCH_SIZE){const r=await request({...payload,keys:CHAIN_KEYS.slice(i,i+CHAIN_ONLINE_BATCH_SIZE)});assert.equal(r.status,200);assert.equal(r.data.ok,true);}
 assert.equal(count(),67);assert.equal(sqlite.prepare('SELECT count(*) AS n FROM challenge_submission_receipts').get().n,67);
 const score=sqlite.prepare('SELECT * FROM challenge_best_scores WHERE target=?').get(chainOnlineTarget(config,'T20'));assert.equal(score.score,2);assert.equal(score.played_count,1);assert.equal(JSON.parse(files.get(score.stats_key)).performance.stats.chainStats.T20.best,2);
 assert.equal((await request(payload)).data.ok,true);assert.equal(sqlite.prepare('SELECT max(played_count) AS n FROM challenge_best_scores').get().n,1);
 failBatch=true;const second=await request({...payload,matchId:'m2',keys:['T20']});assert.equal(second.data.ok,false);assert.equal(sqlite.prepare('SELECT max(played_count) AS n FROM challenge_best_scores').get().n,1);
 assert.equal((await request({...payload,matchId:'m2',keys:['T20']})).data.ok,true);assert.equal(sqlite.prepare('SELECT max(played_count) AS n FROM challenge_best_scores').get().n,2);
 const better=await request({...payload,matchId:'m3',keys:['T20'],entries:Array.from({length:6},()=>({zone:'T',segment:20}))});assert.equal(better.data.ok,true);const best=sqlite.prepare('SELECT * FROM challenge_best_scores WHERE target=?').get(chainOnlineTarget(config,'T20'));assert.equal(best.score,6);assert.equal(best.played_count,3);assert.equal(JSON.parse(files.get(best.stats_key)).performance.stats.chainStats.T20.best,6);
 const query=new URLSearchParams({target:chainOnlineTarget(config,'T20'),rule:'arcade',visits:'2',userId:'user1',scope:'public'});
 const detailResponse=await onRequest({request:new Request('https://local.test/api/challenge/leaderboard/detail?'+query,{headers:{authorization:'Bearer test'}}),env,params:{path:['detail']}});
 assert.equal(detailResponse.status,200);const detail=(await detailResponse.json()).detail;assert.equal(detail.score,6);assert.equal(detail.stats.chainStats.T20.best,6);assert.equal(detail.stats.entries.length,6);assert.equal(chainDetailJournal(detail.stats,detail.darts,'T20').at(-1).current,6);
 const listResponse=await onRequest({request:new Request('https://local.test/api/challenge/leaderboard?'+query,{headers:{authorization:'Bearer test'}}),env,params:{path:[]}});assert.equal(listResponse.status,200);assert.equal((await listResponse.json()).rows[0].score,6);
 // A 30-dart session with successive mixed chains, exactly as in the production smoke test.
 const thirty=Array.from({length:30},(_,i)=>i<4?{zone:'G',segment:20}:i<7?{zone:'T',segment:20}:i<9?{zone:'D',segment:16}:i<12?{zone:i===10?'DBULL':'BULL',segment:null}:{zone:'MISS',segment:null});
 const c30={chainVariant:'hybrid',chainFormat:'rounds',chainDarts:30};
 for(let i=0;i<CHAIN_KEYS.length;i+=CHAIN_ONLINE_BATCH_SIZE){const r=await request({...payload,expectedUserId:'user1',matchId:'mixed30',config:c30,entries:thirty,keys:CHAIN_KEYS.slice(i,i+CHAIN_ONLINE_BATCH_SIZE)});assert.equal(r.data.ok,true);}
 for(const [key,best] of Object.entries({HIT:12,S:4,S20:4,T:3,T20:3,D:2,D16:2,BULL:3,'25':1,'50':1,T19:0})){
  const row=sqlite.prepare('SELECT * FROM challenge_best_scores WHERE target=?').get(chainOnlineTarget(c30,key));assert.equal(row.score,best,key);assert.equal(row.darts,30);assert.equal(row.played_count,1);
  const detail=JSON.parse(files.get(row.stats_key)).performance.stats;assert.equal(detail.entries.length,30);assert.equal(Math.max(...chainDetailJournal(detail,30,key).map(e=>e.current)),best,key);
 }
}finally{globalThis.fetch=orig;sqlite.close();}
console.log('✅ CHAÎNES V4 : 67 catégories, parcours mixte 30 fléchettes, journal détaillé, anciens records sans journal, contrôle du compte, doublons et rollback.');
