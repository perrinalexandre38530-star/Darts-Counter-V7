/** Cloudflare route contract smoke test without any external HTTP request. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const base = resolve(import.meta.dirname, "../functions/api/sports-live/[[path]].ts");
const helper = resolve(import.meta.dirname, "../src/sportsLive/officialStandings.ts");
const feed = resolve(import.meta.dirname, "../src/sportsLive/officialCompetitionFeed.ts");
const support = resolve(import.meta.dirname, "../src/sportsLive/support.ts");
const src = await readFile(base, "utf8");
const out = ts.transpileModule(src, { compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext} }).outputText
  .replace(/from ["']\.\.\/\.\.\/\.\.\/src\/sportsLive\/officialStandings["']/, `from "${pathToFileURL(helper).href}"`);
const dir = await mkdtemp(join(tmpdir(), "msc-v269-route-"));
try {
  const helperJs = ts.transpileModule(await readFile(helper,"utf8"), { compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext} }).outputText;
  await writeFile(join(dir,"officialStandings.mjs"),helperJs);
  const supportJs = ts.transpileModule(await readFile(support,"utf8"), { compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext} }).outputText;
  await writeFile(join(dir,"support.mjs"),supportJs);
  const feedJs = ts.transpileModule(await readFile(feed,"utf8"), { compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext} }).outputText
    .replace(/from ["']\.\/support["']/, `from "${pathToFileURL(join(dir,"support.mjs")).href}"`);
  await writeFile(join(dir,"officialCompetitionFeed.mjs"),feedJs);
  const file = join(dir,"route.mjs");
  await writeFile(file,out.replace(pathToFileURL(helper).href, pathToFileURL(join(dir,"officialStandings.mjs")).href)
    .replace(/from ["']\.\.\/\.\.\/\.\.\/src\/sportsLive\/officialCompetitionFeed["']/, `from "${pathToFileURL(join(dir,"officialCompetitionFeed.mjs")).href}"`));
  const { onRequestGet } = await import(pathToFileURL(file).href);
  const responseBody = {
    competition:{name:"Ligue 1"},season:{startDate:"2025-08-01"},
    standings:[{type:"TOTAL",stage:"REGULAR_SEASON",table:[{
      position:1,team:{name:"Exemple"},playedGames:10,won:8,draw:1,lost:1,points:25,
      goalsFor:20,goalsAgainst:5,goalDifference:15,
    }]}],
  };
  let requests = 0;
  const originalFetch = globalThis.fetch;
  const originalCaches = globalThis.caches;
  globalThis.caches = {default:{match:async()=>null,put:async()=>{}}};
  globalThis.fetch = async (url, init) => {
    requests++;
    assert.match(String(url),/\/competitions\/FL1\/standings\?season=2025/);
    assert.equal(init.headers["X-Auth-Token"],"TEST_SECRET");
    return new Response(JSON.stringify(responseBody),{status:200,headers:{"content-type":"application/json"}});
  };
  const context = (name, country, season) => ({
    request:new Request(`https://test.invalid/api/sports-live/foot/standings?competition=${encodeURIComponent(name)}&country=${encodeURIComponent(country)}&season=${season}`),
    params:{path:["foot","standings"]},env:{FOOTBALL_DATA_API_KEY:"TEST_SECRET"},waitUntil:()=>{},
  });
  try {
    const good = await onRequestGet(context("Ligue 1","France","2025"));
    const data = await good.json();
    assert.equal(data.available,true);
    assert.equal(data.tables[0].rows[0].points,25);
    assert.equal(requests,1);
    assert.equal(JSON.stringify(data).includes("TEST_SECRET"),false);
    const foreign = await onRequestGet(context("Premier League","South Africa","2025"));
    assert.equal((await foreign.json()).available,false);
    assert.equal(requests,1,"Ambiguous country must not reach the provider");
    const invalidYear = await onRequestGet(context("Ligue 1","France","1900"));
    assert.equal((await invalidYear.json()).available,false);
    assert.equal(requests,1,"Invalid season must not reach the provider");
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.caches = originalCaches;
  }
} finally { await rm(dir,{recursive:true,force:true}); }
console.log("LIVE V269: Cloudflare standings endpoint contract OK");
