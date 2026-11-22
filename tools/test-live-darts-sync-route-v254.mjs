// Offline end-to-end Pages Function contract test: all match records are mock fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const require=createRequire(import.meta.url);
const ts=(()=>{try{return require('typescript');}catch{return require(path.join(execFileSync(process.platform==='win32'?'npm.cmd':'npm',['root','-g'],{encoding:'utf8'}).trim(),'typescript'));}})();
function transpile(src,name){return ts.transpileModule(src,{fileName:name,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;}
const archiveModule={exports:{}};
vm.runInNewContext(transpile(fs.readFileSync(new URL('../src/sportsLive/dartsArchiveV254.ts',import.meta.url),'utf8'),'archive.ts'),{module:archiveModule,exports:archiveModule.exports,Date,Map,Set,Number,String,URL,console},{filename:'archive.cjs'});
const source=fs.readFileSync(new URL('../functions/api/sports-live/[[path]].ts',import.meta.url),'utf8');
const module={exports:{}};
const fakeR2=new Map();const etags=new Map();let etagSequence=0;
const bucket={
  async get(key){return fakeR2.has(key)?{etag:etags.get(key),text:async()=>fakeR2.get(key),json:async()=>JSON.parse(fakeR2.get(key))}:null;},
  async put(key,body,options={}){
    if(options.onlyIf?.etagMatches && options.onlyIf.etagMatches!==etags.get(key)) return null;
    if(options.onlyIf?.etagDoesNotMatch==='*' && fakeR2.has(key)) return null;
    fakeR2.set(key,String(body));const etag=`etag-${++etagSequence}`;etags.set(key,etag);return {etag};
  },
  async list({prefix='',limit=1000,cursor=''}){
    const names=[...fakeR2.keys()].filter(k=>k.startsWith(prefix)).sort();
    const index=cursor?Number(cursor):0;
    const set=names.slice(index,index+limit);
    return {objects:set.map(key=>({key})),truncated:index+limit<names.length,cursor:index+limit<names.length?String(index+limit):undefined};
  }
};
const calls=[];
const upstream=async(uri)=>{
  const url=new URL(String(uri));calls.push(url);
  const from=url.searchParams.get('from');
  if(url.pathname.endsWith('/results')) {
    const date=from ? from.replace(/-01$/, '-16') : '2025-03-06';
    const rows=[{match_id:`fixture-${date}`,played_on:date,round:'final',event:{name:'World Sample Championship',country_code:'GB',tier:'major'},winner:{name:'Luke Sample',score:8},loser:{name:'Jane Sample',score:5}}];
    const cursor=url.searchParams.get('cursor');
    return new Response(JSON.stringify({data:cursor?[]:rows,meta:{next_cursor:cursor?null:(from?'page-2':null)}}),{status:200,headers:{'content-type':'application/json'}});
  }
  if(url.pathname.endsWith('/players')) return Response.json({data:[{player_id:'pl_1',name:'Luke Sample'}]});
  if(url.pathname.endsWith('/competitions')) return Response.json({data:[{competition_id:'cp_1',name:'World Sample Championship'}]});
  return Response.json({data:[]});
};
vm.runInNewContext(transpile(source,'backend.ts'),{
  module,exports:module.exports,require:(id)=>id.endsWith('dartsArchiveV254')?archiveModule.exports:{},
  fetch:upstream,Request,Response,URL,URLSearchParams,TextEncoder,TextDecoder,AbortController,Buffer,Date,Map,Set,console,setTimeout,clearTimeout,crypto,
  caches:{default:{match:async()=>null,put:async()=>undefined}},
},{filename:'backend.cjs'});
const {onRequestGet,onRequestPost}=module.exports;
const env={LIVE_OFFICIAL_INGEST_TOKEN:'test-secret',DARTS_API_KEY:'fixture-api-key',USER_DATA_BUCKET:bucket};
const get=(uri,opts=env)=>onRequestGet({params:{path:uri.split('?')[0].split('/')},request:new Request(`https://mss.test/api/sports-live/${uri}`),env:opts,waitUntil:()=>{}});
const post=(uri,body,auth='Bearer test-secret')=>onRequestPost({params:{path:uri.split('/')},request:new Request(`https://mss.test/api/sports-live/${uri}`,{method:'POST',headers:{Authorization:auth},body:JSON.stringify(body)}),env,waitUntil:()=>{}});
assert.equal((await post('darts/results-sync',{mode:'recent'},'')).status,401);
assert.equal((await post('darts/results-sync',{mode:'recent'})).status,200);
assert.ok([...fakeR2.keys()].some(x=>x.includes('sports-live-results/v2/darts/2026/')));
const view=await (await get('darts/results-search?year=2026&source=DartsAPI')).json();
assert.ok(view.results.length>0,'scheduled results searchable in LIVE');
assert.ok(view.archivePartitions>0,'actual persisted months visible');
assert.ok(view.syncStatus?.recent?.updatedAt,'last recent sync shown');
assert.equal(view.results[0].sourceName,'DartsAPI');
const backfill=await (await post('darts/results-sync',{mode:'backfill'})).json();
assert.equal(backfill.ok,true);
assert.equal(backfill.runs[0].completed,true,'two-page fixture completes with cursor');
assert.ok((await (await bucket.get('sports-live-results/v2/jobs/dartsapi/backfill.json')).json()).period<'2026-10');
const importData={schemaVersion:1,rightsConfirmed:true,sourceId:'ligue-test',sourceName:'Ligue Test',sourceUrl:'https://ligue.test/results',results:[{id:'match1',competition:'Club Open',playedOn:'2024-09-08',winner:{name:'Team A',score:6},loser:{name:'Team B',score:2}}]};
assert.equal((await post('darts/results-import',{...importData,rightsConfirmed:false})).status,422);
assert.equal((await post('darts/results-import',importData)).status,200);
const partner=(await (await get('darts/results-search?year=2024&source=Ligue%20Test',{USER_DATA_BUCKET:bucket})).json());
assert.deepEqual(partner.results.map(x=>x.competition),['Club Open']);
assert.equal(partner.archivePersistent,true);
assert.equal((await (await get('darts/results-search?country=WRONG')).json()).error,'invalid_country');
console.log('PASS V254 — secure scheduled POST, DartsAPI pages, R2 partitions, sync telemetry, import rights and searchable provider records');
