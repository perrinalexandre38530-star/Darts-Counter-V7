/** Contract tests: verified match projection, Cloudflare route, R2 isolation.
 * No external HTTP access and no live API key needed. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
const ts=createRequire(import.meta.url)('typescript');
const root=resolve(import.meta.dirname,'..');
const dir=await mkdtemp(join(tmpdir(),'mss-v271-'));
const href=p=>pathToFileURL(join(dir,p)).href;
async function compile(path,file,replaces=[]) {
  let output=ts.transpileModule(await readFile(resolve(root,path),'utf8'),{fileName:path,reportDiagnostics:true,
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}});
  assert.equal(output.diagnostics?.length || 0,0,`Syntax ${path}`);
  for(const [rx,replacement] of replaces)output.outputText=output.outputText.replace(rx,replacement);
  await writeFile(join(dir,file),output.outputText);
}
try {
  await compile('src/sportsLive/officialStandings.ts','standings.mjs');
  await compile('src/sportsLive/officialCompetitionMatches.ts','matches.mjs');
  await compile('src/sportsLive/support.ts','support.mjs');
  await compile('src/sportsLive/officialCompetitionFeed.ts','feed.mjs',[
    [/from ["']\.\/support["']/,`from '${href('support.mjs')}'`],
    [/from ["']\.\/officialCompetitionMatches["']/,`from '${href('matches.mjs')}'`],
  ]);
  await compile('functions/api/sports-live/[[path]].ts','route.mjs',[
    [/from ["']\.\.\/\.\.\/\.\.\/src\/sportsLive\/officialStandings["']/,`from '${href('standings.mjs')}'`],
    [/from ["']\.\.\/\.\.\/\.\.\/src\/sportsLive\/officialCompetitionMatches["']/,`from '${href('matches.mjs')}'`],
    [/from ["']\.\.\/\.\.\/\.\.\/src\/sportsLive\/officialCompetitionFeed["']/,`from '${href('feed.mjs')}'`],
  ]);
  await compile('src/sportsLive/CompetitionDashboard.tsx','dashboard.mjs');
  const {projectFootballCompetitionMatches,verifiedKnockoutRounds}=await import(href('matches.mjs'));
  const {onRequestGet,onRequestPost}=await import(href('route.mjs'));
  const provider={competition:{name:'Ligue 1',code:'FL1'},filters:{season:'2026'},matches:[
    {id:100,stage:'REGULAR_SEASON',matchday:1,status:'SCHEDULED',utcDate:'2026-11-25T19:00:00Z',homeTeam:{name:'Alpha'},awayTeam:{name:'Beta'},score:{fullTime:{home:0,away:0}}},
    {id:101,stage:'SEMI_FINALS',status:'FINISHED',utcDate:'2026-05-10T19:00:00Z',homeTeam:{name:'Gamma'},awayTeam:{name:'Delta'},score:{fullTime:{home:2,away:1}}},
    {id:102,stage:'FINAL',status:'IN_PLAY',utcDate:'2026-05-12T19:00:00Z',homeTeam:{name:'Gamma'},awayTeam:{name:'Epsilon'},score:{fullTime:{home:1,away:1}}},
    {id:103,stage:'FINAL',status:'CANCELLED',utcDate:'2026-06-12T19:00:00Z',homeTeam:{name:'Alpha'},awayTeam:{name:'Delta'},score:{fullTime:{home:3,away:0}}},
  ]};
  const projected=projectFootballCompetitionMatches(provider,'Ligue 1','2026');
  assert.equal(projected.matches.length,4);
  assert.equal(projected.matches[0].scoreA,null,'Never turn scheduled 0-0 into result');
  assert.equal(projected.matches[1].scoreA,2);
  assert.equal(projected.matches[3].status,'cancelled');
  assert.equal(projected.matches[3].scoreA,null,'Never retain cancelled score');
  assert.deepEqual(verifiedKnockoutRounds(projected.matches).map(r=>r.name),['Demi-finales','Finale']);
  assert.equal(projectFootballCompetitionMatches({...provider,filters:{season:'2025'}},'Ligue 1','2026').available,false);
  const originalFetch=globalThis.fetch,originalCaches=globalThis.caches;
  const store=new Map();let requests=0;
  globalThis.caches={default:{match:async()=>null,put:async()=>{}}};
  globalThis.fetch=async (url,init)=>{
    requests++;
    assert.equal(String(url),'https://api.football-data.org/v4/competitions/FL1/matches?season=2026');
    assert.equal(init.headers['X-Auth-Token'],'PRIVATE_FOOTBALL_KEY');
    return new Response(JSON.stringify(provider),{status:200,headers:{'content-type':'application/json'}});
  };
  const env={FOOTBALL_DATA_API_KEY:'PRIVATE_FOOTBALL_KEY',LIVE_OFFICIAL_INGEST_TOKEN:'PRIVATE_INGEST',
    LIVE_OFFICIAL_BUCKET:{get:async key=>store.has(key)?{json:async()=>JSON.parse(store.get(key))}:null,put:async(k,p)=>store.set(k,p)}};
  const ctx=(sport,action,name,country,year,method='GET',data,token='Bearer PRIVATE_INGEST')=>({
    params:{path:[sport,action]},env,waitUntil:()=>{},
    request:new Request(`https://test.invalid/api/sports-live/${sport}/${action}?competition=${encodeURIComponent(name)}&country=${encodeURIComponent(country)}&season=${year}`,{
      method,headers:method==='POST'?{'content-type':'application/json',Authorization:token}:undefined,
      body:method==='POST'?JSON.stringify(data):undefined,
    }),
  });
  try {
    const football=await (await onRequestGet(ctx('foot','matches','Ligue 1','France','2026'))).json();
    assert.equal(football.available,true);assert.equal(football.matches.length,4);assert.equal(requests,1);
    assert.equal(JSON.stringify(football).includes('PRIVATE_FOOTBALL_KEY'),false);
    assert.equal((await(await onRequestGet(ctx('foot','matches','Premier League','Kenya','2026'))).json()).available,false);
    assert.equal((await(await onRequestGet(ctx('foot','matches','Ligue 1','France','1900'))).json()).available,false);
    assert.equal(requests,1,'No external call for foreign or invalid season');
    const ping={sport:'pingpong',competition:'Tournoi régional',country:'France',season:'2026',sourceName:'Fédération test',sourceUrl:'https://example.org/results',
      tables:[],bracket:[],matches:[{id:'p1',participantA:'Alice',participantB:'Bob',status:'finished',scoreA:3,scoreB:1,startsAt:'2026-11-11T09:00:00Z',stage:'final'}]};
    assert.equal((await onRequestPost(ctx('pingpong','official','Tournoi régional','France','2026','POST',ping,'Bearer BAD'))).status,401);
    assert.equal((await onRequestPost(ctx('pingpong','official','Tournoi régional','France','2026','POST',ping))).status,200);
    const managed=await(await onRequestGet(ctx('pingpong','matches','Tournoi régional','France','2026'))).json();
    assert.equal(managed.matches[0].scoreB,1);assert.equal(managed.sourceName,'Fédération test');
    assert.equal((await(await onRequestGet(ctx('pingpong','matches','Tournoi régional','Belgique','2026'))).json()).available,false);
    assert.equal((await(await onRequestGet(ctx('darts','matches','Tournoi régional','France','2026'))).json()).available,false);
    assert.equal((await(await onRequestGet(ctx('pingpong','matches','Tournoi régional','France','2025'))).json()).available,false);
    assert.equal(requests,1,'Other sports never call football provider');
  }finally{globalThis.fetch=originalFetch;globalThis.caches=originalCaches;}
  console.log('LIVE V271: supplier matches, brackets, statuses, seasonal guards, managed R2, security OK');
}finally{await rm(dir,{recursive:true,force:true});}
