/** Run: node --experimental-strip-types tools/test-live-darts-archive-v254.mjs */
import assert from 'node:assert/strict';
import {archivePeriod,previousArchiveMonth,monthQueryRange,appendDartsArchiveMonth,appendDartsArchiveBatch,searchDartsV2Archive,loadDartsSyncJob,saveDartsSyncJob} from '../src/sportsLive/dartsArchiveV254.ts';
import syncWorker from '../cloudflare/mss-live-darts-sync-worker.mjs';

class MemoryR2 {
  store=new Map();etagMap=new Map();sequence=0;
  async get(key) {const v=this.store.get(key);return v===undefined?null:{etag:this.etagMap.get(key),json:async()=>structuredClone(v),text:async()=>JSON.stringify(v)};}
  async put(key,payload,options={}) {
    if(options.onlyIf?.etagMatches && options.onlyIf.etagMatches!==this.etagMap.get(key)) return null;
    if(options.onlyIf?.etagDoesNotMatch==='*' && this.store.has(key)) return null;
    this.store.set(key,JSON.parse(String(payload)));
    const etag=`etag-${++this.sequence}`;this.etagMap.set(key,etag);return {etag};
  }
  async list({prefix='',limit=1000,cursor=''}) {
    const entries=[...this.store.keys()].filter(key=>key.startsWith(prefix)).sort();
    const start=cursor?Number(cursor):0;
    const keys=entries.slice(start,start+limit);
    return {objects:keys.map(key=>({key})),truncated:start+limit<entries.length,cursor:start+limit<entries.length?String(start+limit):undefined};
  }
}
const bucket=new MemoryR2();
assert.equal(archivePeriod('2026-02-30'),null);
assert.equal(archivePeriod('2026-02-28'),'2026-02');
assert.equal(previousArchiveMonth('2026-01'),'2025-12');
assert.deepEqual(monthQueryRange('2024-02'),{from:'2024-02-01',to:'2024-02-29'});
const filters={q:'',year:'',competition:'',country:'',level:'',source:''};
function score(id,date,winner='One',loser='Two',score=6,sourceName='DartsAPI') {
  return {id,playedOn:date,competition:'International Open',round:'Final',winner:{name:winner,score},loser:{name:loser,score:3},sourceName,sourceUrl:'https://dartsapi.com/'};
}
await appendDartsArchiveMonth(bucket,'2026-11','dartsapi',[score('A','2026-11-20'),score('B','2026-11-21')]);
let saved=await appendDartsArchiveMonth(bucket,'2026-11','dartsapi',[score('A','2026-11-20','One','Two',7)]);
assert.equal(saved.stored,2,'replay of same match must not duplicate');
const updated=await bucket.get('sports-live-results/v2/darts/2026/11/dartsapi.json');
assert.equal((await updated.json()).results.find(x=>x.id==='A').winner.score,7,'score correction must replace previous');
await appendDartsArchiveMonth(bucket,'2026-10','dartsapi',[score('OCT','2026-10-01')]);
await appendDartsArchiveBatch(bucket,'dartup',[score('D','2025-08-03','Alice','Bob',6,'DartUP')]);
assert.equal((await appendDartsArchiveMonth(bucket,'2026-09','dartsapi',[])).stored,0,'empty ingest should not create a false archive');
let results=[];let cursor='';let pages=0;let scanned=0;
do {
  const page=await searchDartsV2Archive(bucket,filters,cursor,1,1);
  results.push(...page.results);cursor=page.nextCursor||'';pages++;scanned+=page.partitionsScanned;
  assert.ok(pages<20,'pagination cursor must advance');
} while(cursor);
assert.equal(results.length,4);
assert.equal(new Set(results.map(r=>r.id)).size,4);
assert.ok(scanned >= 3);
const specific=await searchDartsV2Archive(bucket,{...filters,year:'2025',q:'alice'},'',80,24);
assert.deepEqual(specific.results.map(r=>r.id),['D']);
const bySource=await searchDartsV2Archive(bucket,{...filters,source:'DartsAPI'},'',80,24);
assert.deepEqual(new Set(bySource.results.map(r=>r.id)),new Set(['A','B','OCT']));
const missing=await searchDartsV2Archive(null,filters);
assert.equal(missing.archivePartitions,0);
await saveDartsSyncJob(bucket,{mode:'backfill',period:'2025-08',nextCursor:'opaque:cursor',completed:false,totalFetched:120,updatedAt:'2026-11-22T10:00:00Z'});
assert.equal((await loadDartsSyncJob(bucket,'backfill')).nextCursor,'opaque:cursor');
const oldFetch=globalThis.fetch;
let called=[];
globalThis.fetch=async (url,options)=> {called.push({url,options});return {ok:true,status:200,json:async()=>({ok:true,runs:[{period:'2026-11',received:4}],updatedAt:'2026-11-22'})};};
try {
  for(const [cron,mode] of [['0 */6 * * *','recent'],['15 */6 * * *','backfill']]) {
    const promises=[];
    await syncWorker.scheduled({cron},{LIVE_SYNC_TARGET:'https://multisports-scoring.pages.dev/',LIVE_OFFICIAL_INGEST_TOKEN:'local-test-token'},{waitUntil:p=>promises.push(p)});
    await Promise.all(promises);
    assert.equal(JSON.parse(called.at(-1).options.body).mode,mode);
    assert.equal(called.at(-1).options.headers.Authorization,'Bearer local-test-token');
  }
  assert.equal((await syncWorker.fetch()).status,404,'worker must not expose manual public HTTP trigger');
} finally {globalThis.fetch=oldFetch;}
console.log('PASS V254 — archive month merges, score updates, no empty shards, 4-page seek, filters, cursor state, two cron schedules and authorization header');
