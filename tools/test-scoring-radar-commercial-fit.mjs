import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');
const src=path.resolve('scoring-radar/src');
const dest=fs.mkdtempSync(path.join(os.tmpdir(),'radar-fit-'));
for(const name of ['commercial-fit','intent-shield','source-quality']) {
  const content=fs.readFileSync(path.join(src,name+'.ts'),'utf8');
  const transpiled=ts.transpileModule(content,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  fs.writeFileSync(path.join(dest,name+'.js'),transpiled);
}
const {assessCommercialFit}=require(path.join(dest,'commercial-fit.js'));
const cases=[
  ['Reddit real request',{source_url:'https://www.reddit.com/r/Darts/comments/123/score/',title:'What app do you use to track darts scores?',snippet:'I am looking for a scoring app with stats for our darts league.'},true],
  ['FR request',{source_url:'https://example.org/forum/darts/123',title:'Je cherche une application pour compter les scores aux fléchettes',snippet:'Vous conseillez quoi pour suivre mes statistiques ?'},true],
  ['Italian recruitment',{source_url:'https://gdrplayers.it/annunci/test',title:'Cerco master o giocatore esperto di D&D',snippet:'Sono uno sviluppatore di app per la gestione scheda D&D'},false],
  ['Darts editorial',{source_url:'https://cswdarts.co.uk/news/littler',title:'Beat Luke Littler Winner Fallon Sherrock',snippet:'Play Darts crossword weekly and check out our scoreboard.'},false],
  ['TikTok commercial',{source_url:'https://www.tiktok.com/@abc/video/123',title:'Darts Counter App with Camera',snippet:'Try this camera setup for DartCounter #darts'},false],
  ['Generic hobby',{source_url:'https://www.reddit.com/r/Hobbies/comments/123',title:'Find a new hobby',snippet:'What do you recommend?'},false],
  ['Product storefront',{source_url:'https://play.google.com/store/apps/details?id=foo',title:'App for darts scoring',snippet:'Track your games and stats'},false]
];
for(const [label,row,expected] of cases){const outcome=assessCommercialFit(row); assert.equal(outcome.actionable,expected,`${label}: ${JSON.stringify(outcome)}`);}
console.log('SCORING RADAR commercial-fit OK ('+cases.length+' scenarios)');
