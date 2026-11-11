import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const base=resolve(import.meta.dirname,'..');
const dir=await mkdtemp(join(tmpdir(),'mss-live-v270-'));
const compile=async(input,output,replacements=[])=>{
  let code=(await readFile(resolve(base,input),'utf8'));
  const diagnostics=ts.transpileModule(code,{fileName:input,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}});
  assert.equal(diagnostics.diagnostics.length,0,`TS syntax for ${input}`);
  code=diagnostics.outputText;
  for(const [from,to] of replacements)code=code.replace(from,to);
  await writeFile(join(dir,output),code);
};
const url=name=>pathToFileURL(join(dir,name)).href;
try {
  await compile('src/sportsLive/support.ts','support.mjs');
  await compile('src/sportsLive/officialStandings.ts','officialStandings.mjs');
  await compile('src/sportsLive/officialCompetitionMatches.ts','officialCompetitionMatches.mjs');
  await compile('src/sportsLive/officialCompetitionFeed.ts','officialCompetitionFeed.mjs',[[/from ["']\.\/support["']/,`from '${url('support.mjs')}'`],[/from ["']\.\/officialCompetitionMatches["']/,`from '${url('officialCompetitionMatches.mjs')}'`]]);
  await compile('functions/api/sports-live/[[path]].ts','route.mjs',[
    [/from ["']\.\.\/\.\.\/\.\.\/src\/sportsLive\/officialStandings["']/,`from '${url('officialStandings.mjs')}'`],
    [/from ["']\.\.\/\.\.\/\.\.\/src\/sportsLive\/officialCompetitionFeed["']/,`from '${url('officialCompetitionFeed.mjs')}'`],
    [/from ["']\.\.\/\.\.\/\.\.\/src\/sportsLive\/officialCompetitionMatches["']/,`from '${url('officialCompetitionMatches.mjs')}'`],
  ]);
  const {parseManagedCompetitionFeed,managedCompetitionKey}=await import(url('officialCompetitionFeed.mjs'));
  const {onRequestGet,onRequestPost}=await import(url('route.mjs'));
  const raw={sport:'pingpong',competition:'Compétition Alpha',country:'France',season:'2026',sourceName:'Fédération de test',sourceUrl:'https://example.org/results',
    tables:[{name:'Groupe A',stage:'GROUP_STAGE',group:'A',rows:[{position:1,name:'Club 1',played:2,won:2,points:4},{position:2,name:'Club 2',points:2}]}],
    bracket:[{id:'final',name:'Finale',order:6,matches:[{id:'m1',participantA:'Club 1',participantB:'Club 2',status:'scheduled',scoreA:null,scoreB:null,nextMatchId:'fake-id'}]}]};
  assert.equal(parseManagedCompetitionFeed(raw,'pingpong')?.bracket[0].matches[0].nextMatchId,null,'Never invent next-match links');
  assert.equal(parseManagedCompetitionFeed(raw,'darts'),null,'sport isolation');
  assert.equal(parseManagedCompetitionFeed({...raw,sourceUrl:'http://localhost/malicious'},'pingpong'),null,'HTTPS only');
  assert.equal(managedCompetitionKey('pingpong','France','Compétition Alpha','bad-season'),null);
  const map=new Map();const store={get:async k=>map.has(k)?{json:async()=>JSON.parse(map.get(k))}:null,put:async(k,data)=>{map.set(k,data)}};
  const env={USER_DATA_BUCKET:store,LIVE_OFFICIAL_INGEST_TOKEN:'PRIVATE_TEST_TOKEN'};
  const originalCaches=globalThis.caches;globalThis.caches={default:{match:async()=>null,put:async()=>{}}};
  const ctx=(method,sport,action,country='France',competition='Compétition Alpha',season='2026',body=raw,auth='Bearer PRIVATE_TEST_TOKEN')=>({
    params:{path:[sport,action]},env,waitUntil:()=>{},
    request:new Request(`https://example.test/api/sports-live/${sport}/${action}?country=${encodeURIComponent(country)}&competition=${encodeURIComponent(competition)}&season=${season}`,{
      method,headers:method==='POST'?{'content-type':'application/json',Authorization:auth}:undefined,body:method==='POST'?JSON.stringify(body):undefined,
    }),
  });
  try{
    assert.equal((await onRequestPost(ctx('POST','pingpong','official','France','Compétition Alpha','2026',raw,'Bearer BAD'))).status,401);
    assert.equal(map.size,0);
    const posted=await onRequestPost(ctx('POST','pingpong','official'));
    assert.equal(posted.status,200,await posted.clone().text());
    assert.equal((await posted.json()).bracketRounds,1);
    assert.equal(map.size,1);
    const read=await onRequestGet(ctx('GET','pingpong','standings'));
    const data=await read.json();
    assert.equal(data.available,true);
    assert.equal(data.sourceName,'Fédération de test');
    assert.equal(data.tables[0].rows[1].played,null,'Never manufacture missing games played');
    assert.equal(data.bracket[0].matches[0].nextMatchId,null);
    assert.equal((await (await onRequestGet(ctx('GET','pingpong','standings','Belgique'))).json()).available,false,'country isolation');
    assert.equal((await (await onRequestGet(ctx('GET','pingpong','standings','France','Autre compétition'))).json()).available,false,'competition isolation');
    assert.equal((await (await onRequestGet(ctx('GET','darts','standings'))).json()).available,false,'sport isolation');
    assert.equal((await (await onRequestGet(ctx('GET','pingpong','standings','France','Compétition Alpha','2025'))).json()).available,false,'season isolation');
    const failed=await onRequestPost(ctx('POST','pingpong','official','France','Compétition Alpha','2026',{...raw,season:'1965'}));
    assert.equal(failed.status,422);
  } finally {globalThis.caches=originalCaches;}
  console.log('LIVE V270: secure ingestion, managed R2 retrieval, source attribution, bracket & 4-way isolation OK');
} finally {await rm(dir,{recursive:true,force:true});}
