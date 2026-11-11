/** LIVE V272 - realistic contract integration for DartsAPI / Table Tennis API.
 * Providers are mocked: no API key, internet or subscription required. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
const ts = createRequire(import.meta.url)("typescript");
const root=resolve(import.meta.dirname,"..");
const dir=await mkdtemp(join(tmpdir(),"mss-live-v272-"));
const href=name=>pathToFileURL(join(dir,name)).href;
async function compile(path,name,replacements=[]) {
  const out=ts.transpileModule(await readFile(resolve(root,path),"utf8"),{
    fileName:path,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}});
  assert.equal(out.diagnostics?.length||0,0,`Syntax ${path}`);
  let source=out.outputText;
  for(const [pattern,value] of replacements) source=source.replace(pattern,value);
  await writeFile(join(dir,name),source);
}
try {
  await compile("src/sportsLive/officialStandings.ts","standings.mjs");
  await compile("src/sportsLive/officialCompetitionMatches.ts","matches.mjs");
  await compile("src/sportsLive/specialistCompetitionMatches.ts","specialist.mjs",[
    [/from ["']\.\/officialCompetitionMatches["']/,`from '${href("matches.mjs")}'`],
  ]);
  await compile("src/sportsLive/support.ts","support.mjs");
  await compile("src/sportsLive/officialCompetitionFeed.ts","feed.mjs",[
    [/from ["']\.\/support["']/,`from '${href("support.mjs")}'`],
    [/from ["']\.\/officialCompetitionMatches["']/,`from '${href("matches.mjs")}'`],
  ]);
  await compile("functions/api/sports-live/[[path]].ts","route.mjs",[
    [/from ["']\.\.\/\.\.\/\.\.\/src\/sportsLive\/officialStandings["']/,`from '${href("standings.mjs")}'`],
    [/from ["']\.\.\/\.\.\/\.\.\/src\/sportsLive\/officialCompetitionMatches["']/,`from '${href("matches.mjs")}'`],
    [/from ["']\.\.\/\.\.\/\.\.\/src\/sportsLive\/officialCompetitionFeed["']/,`from '${href("feed.mjs")}'`],
    [/from ["']\.\.\/\.\.\/\.\.\/src\/sportsLive\/specialistCompetitionMatches["']/,`from '${href("specialist.mjs")}'`],
  ]);
  const {onRequestGet}=await import(href("route.mjs"));
  const {dartsCompetitionIdentity,tableTennisEventIdentity,projectDartsCompetitionMatches}=await import(href("specialist.mjs"));
  const {verifiedKnockoutRounds}=await import(href("matches.mjs"));
  assert.equal(dartsCompetitionIdentity({data:[{competition_id:"cp_123ABC",name:"World Championship"},{competition_id:"cp_345DEF",name:"World Youth Championship"}]},"World Championship 2026"),"cp_123ABC");
  assert.equal(dartsCompetitionIdentity({data:[{competition_id:"cp_123ABC",name:"World Championship"},{competition_id:"cp_345DEF",name:"World Championship"}]},"World Championship"),null,"Ambiguous exact-name ID rejected");
  assert.equal(tableTennisEventIdentity({data:[{id:"ev_AA123",name:"Contender Istanbul 2025",date:"2025-11-11"},{id:"ev_BB123",name:"Contender Istanbul 2026",date:"2026-11-11"}]},"Contender Istanbul", "2026"),"ev_BB123");
  const partial=projectDartsCompetitionMatches([{match_id:"mt_TEST",event:{competition_id:"cp_X12345"},winner:{name:"Alice",score:5},loser:{name:"Bob",score:2},played_on:"2026-03-01",round:"quarter_final"}],[],"cp_X12345","Championship", "2026");
  assert.equal(partial.matches.length,1);
  assert.equal(verifiedKnockoutRounds(partial.matches)[0].name,"Quarts de finale");
  const calls=[];
  const oldFetch=globalThis.fetch, oldCaches=globalThis.caches;
  globalThis.caches={default:{match:async()=>null,put:async()=>{}}};
  globalThis.fetch=async (url,init)=>{
    const u=new URL(String(url));
    calls.push(`${u.host}${u.pathname}${u.search}`);
    assert.equal(init.headers.Authorization,u.host.includes("dartsapi.com")?"Bearer PRIVATE_DARTS":"Bearer PRIVATE_TT");
    if(u.pathname.endsWith("/competitions"))return Response.json({data:[
      {name:"World Championship",competition_id:"cp_X12345"},
      {name:"World Youth Championship",competition_id:"cp_Y54321"},
    ]});
    if(u.pathname.endsWith("/results"))return Response.json({data:[
      {match_id:"mt_2026",event:{competition_id:"cp_X12345"},round:"quarter_final",played_on:"2026-05-02",winner:{name:"Player A",score:6},loser:{name:"Player B",score:3},result_status:"final"},
      {match_id:"mt_2025",event:{competition_id:"cp_X12345"},round:"final",played_on:"2025-05-02",winner:{name:"Player C",score:7},loser:{name:"Player D",score:1}},
      {match_id:"mt_FOREIGN",event:{competition_id:"cp_Z99999"},round:"final",played_on:"2026-05-03",winner:{name:"Wrong",score:4},loser:{name:"Target",score:2}},
    ],meta:{next_cursor:null}});
    if(u.pathname.endsWith("/fixtures"))return Response.json({data:[
      {match_id:"mt_FUTURE",event:{competition_id:"cp_X12345"},starts_at:"2026-12-15T18:00:00Z",round:"semi_final",home:{name:"Player E"},away:{name:"Player F"},status:"scheduled"},
    ],meta:{next_cursor:null}});
    if(u.pathname.endsWith("/events"))return Response.json({data:[
      {event_id:"ev_IST26",name:"Contender Istanbul 2026",date:"2026-11-10"},
      {event_id:"ev_PAR26",name:"Contender Paris 2026",date:"2026-10-10"},
    ]});
    if(u.pathname.endsWith("/events/ev_IST26/matches"))return Response.json({data:[
      {id:"mt_TT1",event:{id:"ev_IST26"},date:"2026-11-11",round_name:"Semi-final",status:"finished",sides:[{name:"Player K"},{name:"Player L"}],score:{home:3,away:2}},
      {id:"mt_TT2",event:{id:"ev_IST26"},start_time:"2026-11-14T13:00:00Z",round_name:"Final",status:"scheduled",sides:[{name:"À confirmer"},{name:"Player M"}],score:{home:0,away:0}},
      {id:"mt_BAD",event:{id:"ev_OTHER"},date:"2026-11-11",round_name:"Final",status:"finished",sides:[{name:"Other"},{name:"Wrong"}],score:[3,2]},
    ]});
    throw Error(`Unexpected provider request ${u}`);
  };
  const env={DARTS_API_KEY:"PRIVATE_DARTS",TABLE_TENNIS_API_KEY:"PRIVATE_TT"};
  const ctx=(sport,name,year,environment=env)=>({
    params:{path:[sport,"matches"]},env:environment,waitUntil:()=>{},
    request:new Request(`https://test.invalid/api/sports-live/${sport}/matches?competition=${encodeURIComponent(name)}&country=Monde&season=${year}`),
  });
  try {
    const dr=await (await onRequestGet(ctx("darts","World Championship","2026"))).json();
    assert.equal(dr.available,true);assert.equal(dr.sourceName,"DartsAPI");assert.equal(dr.matches.length,2);
    assert.equal(dr.matches.find(m=>m.id==="mt_2026").scoreA,6);
    assert.equal(dr.matches.find(m=>m.id==="mt_2026").startsAt,null,"Do not invent a start time for date-only results");
    assert.equal(dr.matches.find(m=>m.id==="mt_2026").dateOnly,"2026-05-02");
    assert.equal(dr.matches.find(m=>m.id==="mt_FUTURE").scoreA,null);
    assert.equal(verifiedKnockoutRounds(dr.matches).length,2);
    const tt=await (await onRequestGet(ctx("pingpong","Contender Istanbul","2026"))).json();
    assert.equal(tt.available,true);assert.equal(tt.sourceName,"Table Tennis API");assert.equal(tt.matches.length,2);
    assert.equal(tt.matches.find(m=>m.id==="mt_TT1").scoreB,2);
    assert.equal(tt.matches.find(m=>m.id==="mt_TT1").startsAt,null,"Local table tennis date is not a UTC start time");
    assert.equal(tt.matches.find(m=>m.id==="mt_TT2").scoreA,null);
    assert.equal(verifiedKnockoutRounds(tt.matches).length,2);
    const oldCount=calls.length;
    const missing=await (await onRequestGet(ctx("darts","World Championship","1900"))).json();
    assert.equal(missing.available,false);assert.equal(calls.length,oldCount,"No remote request on unsupported season");
    const noKey=await (await onRequestGet(ctx("darts","World Championship","2026",{}))).json();
    assert.equal(noKey.available,false);assert.equal(calls.length,oldCount,"No remote call without API key");
    assert.equal(JSON.stringify([dr,tt]).includes("PRIVATE_"),false,"No secret in response");
    assert(calls.some(url=>url.includes("competition_id=cp_X12345")));
    console.log("LIVE V272: DartsAPI+Table Tennis API explicit identity, score statuses, year, R2-independent auth, brackets OK");
  } finally {globalThis.fetch=oldFetch;globalThis.caches=oldCaches;}
} finally {await rm(dir,{force:true,recursive:true});}
