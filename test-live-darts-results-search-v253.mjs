// Offline contract tests. Mocked HTTP responses are fixtures, NEVER published results.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const require = createRequire(import.meta.url);
const ts = (() => { try { return require('typescript'); } catch { return require(path.join(execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['root', '-g'], { encoding:'utf8' }).trim(), 'typescript')); } })();
const source = fs.readFileSync(new URL('../functions/api/sports-live/[[path]].ts',import.meta.url),'utf8');
const transpiled = ts.transpileModule(source,{fileName:'backend.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const modules = {exports:{}};
const fakeR2 = new Map();
const bucket = {
  async get(key){return fakeR2.has(key)?{text:async()=>fakeR2.get(key),json:async()=>JSON.parse(fakeR2.get(key))}:null;},
  async put(key,body){fakeR2.set(key,String(body));return {};}
};
const calls = [];
const upstream = async (uri,options={}) => {
  const url = new URL(String(uri));calls.push(url);
  let data=[],meta={next_cursor:null};
  if(url.pathname.endsWith('/players')) data=[{player_id:'pl_1',name:'Luke Sample'}];
  if(url.pathname.endsWith('/competitions')) data=[{competition_id:'cp_1',name:'World Sample Championship'}];
  if(url.pathname.endsWith('/results')){
    data=[{match_id:'mt_1',played_on:'2025-03-06',round:'final',event:{name:'World Sample Championship',country_code:'GB',tier:'majors'},winner:{name:'Luke Sample',score:8},loser:{name:'Jane Sample',score:5}}];
    if(url.searchParams.get('cursor')) data=[];
    else if(!url.searchParams.has('player_id')&&!url.searchParams.has('competition_id')) meta.next_cursor='next_123';
  }
  return new Response(JSON.stringify({data,meta}),{status:200,headers:{'content-type':'application/json'}});
};
let doFetch = upstream;
const context = {
  module:modules,exports:modules.exports,require:(id)=>({}),fetch:(...args)=>doFetch(...args),Request,Response,URL,URLSearchParams,
  TextEncoder,TextDecoder,AbortController,Buffer,setTimeout,clearTimeout,crypto,console,
  caches:{default:{match:async()=>null,put:async()=>undefined}},
};
vm.runInNewContext(transpiled,context,{filename:'backend.v253.cjs'});
const {onRequestGet,onRequestPost} = modules.exports;
assert.equal(typeof onRequestGet,'function');
function call(path,env={}){
 return onRequestGet({params:{path:path.split("?")[0].split('/').filter(Boolean)},request:new Request(`https://mss.test/api/sports-live/${path}`),env,waitUntil:(promise)=>{void promise.catch(()=>{});}});
}
const absent = await call('darts/results-search');
assert.equal(absent.status,200);
const absentBody = await absent.json();
assert.equal(absentBody.results.length,0);
assert.equal(absentBody.providers.find(p=>p.id==='dartsapi').state,'unconfigured');
assert.equal(absentBody.providers.find(p=>p.id==='dartup').state,'unconfigured');
const withKey = await call('darts/results-search?q=Luke%20Sample&year=2025',{DARTS_API_KEY:'fixture-api-key'});
const withKeyBody = await withKey.json();
assert.equal(withKeyBody.results.length,1);
assert.equal(withKeyBody.results[0].winner.name,'Luke Sample');
assert.equal(withKeyBody.results[0].winner.score,8);
assert.equal(withKeyBody.results[0].sourceName,'DartsAPI');
assert.ok(calls.some(u=>u.pathname.endsWith('/players')&&u.searchParams.get('q')==='Luke Sample'));
const firstPage = await (await call('darts/results-search',{DARTS_API_KEY:'fixture-api-key'})).json();
assert.equal(firstPage.nextProviderCursor,'next_123');
const second = await (await call('darts/results-search?cursor=next_123',{DARTS_API_KEY:'fixture-api-key'})).json();
assert.equal(second.nextProviderCursor,null);
const wrongYear = await (await call('darts/results-search?year=2024',{DARTS_API_KEY:'fixture-api-key'})).json();
assert.equal(wrongYear.results.length,0);
const invalid = await call('darts/results-search?year=1825');
assert.equal(invalid.status,400);
// Import route must never accept unauthenticated or undeclared rights.
const payload={schemaVersion:1,rightsConfirmed:true,sourceId:'league-fixture',sourceName:'League Fixture',sourceUrl:'https://league.test/results',countryCode:'FR',level:'amateur',results:[{id:'1',competition:'National Sample',playedOn:'2025-05-05',round:'final',winner:{name:'A Sample',score:5},loser:{name:'B Sample',score:2}}]};
async function post(auth,body=payload){return onRequestPost({params:{path:['darts','results-import']},request:new Request('https://mss.test/api/sports-live/darts/results-import',{method:'POST',headers:auth?{'Authorization':auth}:{},body:JSON.stringify(body)}),env:{LIVE_OFFICIAL_INGEST_TOKEN:'secret',USER_DATA_BUCKET:bucket},waitUntil:()=>{}});}
assert.equal((await post(null)).status,401);
assert.equal((await post('Bearer secret',{...payload,rightsConfirmed:false})).status,422);
const imported = await post('Bearer secret');
assert.equal(imported.status,200);
assert.equal((await imported.json()).imported,1);
const fromR2 = await call('darts/results-search?source=League%20Fixture',{USER_DATA_BUCKET:bucket});
const fromR2Body=await fromR2.json();
assert.equal(fromR2Body.results.length,1);
assert.equal(fromR2Body.results[0].competition,'National Sample');
assert.equal(fromR2Body.archivePersistent,true);
const noWrongCountry = await (await call('darts/results-search?country=GB',{USER_DATA_BUCKET:bucket})).json();
assert.equal(noWrongCountry.results.length,0);
// Other LIVE sports use the same results page and search their own R2 archives.
const footballArchive = {version:1,sport:'foot',lang:'fr',updatedAt:'2026-11-22T10:00:00.000Z',results:[
  {id:'ft_1',playedOn:'2025-04-09',competition:'League Sample',winner:{name:'Team A',score:2},loser:{name:'Team B',score:1},sourceName:'Official League'},
  {id:'ft_2',playedOn:'2024-04-09',competition:'League Sample',winner:{name:'Team C',score:3},loser:{name:'Team D',score:0},sourceName:'Official League'},
],fixtures:[],events:[]};
fakeR2.set('sports-live-public/v1/foot/fr.json',JSON.stringify(footballArchive));
const footballFiltered = await (await call('foot/results-search?year=2025&lang=en',{USER_DATA_BUCKET:bucket})).json();
assert.equal(footballFiltered.results.length,1);
assert.equal(footballFiltered.results[0].winner.name,'Team A');
assert.equal(footballFiltered.archivePersistent,true);
assert.equal(footballFiltered.providers[1].count,1);
const footballWrong = await (await call('foot/results-search?q=Unknown%20Team',{USER_DATA_BUCKET:bucket})).json();
assert.equal(footballWrong.results.length,0);
const footballBad = await call('foot/results-search?country=WRONG',{USER_DATA_BUCKET:bucket});
assert.equal(footballBad.status,400);
console.log('LIVE V253: DartsAPI/provider, R2 archive, multisport search, filters, import auth and rights: PASS');
