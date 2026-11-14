/**
 * SHOVE V145 : regression tests against the REAL Wave61 engine, with its
 * SHOVE helpers loaded in-process. No network, browsers or data mutation.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); }
catch { ts = require(resolve(execFileSync('npm', ['root', '-g'], {encoding:'utf8'}).trim(), 'typescript')); }
const root = new URL('../', import.meta.url);
const moduleAt = (relative, dependencies={}) => {
  const file = new URL(relative, root);
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {compilerOptions:{module: ts.ModuleKind.CommonJS,target: ts.ScriptTarget.ES2022,jsx: ts.JsxEmit.React},fileName:file.pathname}).outputText;
  const module = {exports:{}};
  const context = {module,exports:module.exports,require:(name)=>{
    if (!(name in dependencies)) throw new Error(`${relative}: unexpected import ${name}`);
    return dependencies[name];
  },Date,Math,console,Set,Map,JSON,Object,Array,Number,Boolean,String};
  vm.runInNewContext(code,context,{filename:relative});
  return module.exports;
};
const targets = moduleAt('src/lib/gameEngines/shoveAPennyTargets.ts');
const ranking = moduleAt('src/lib/gameEngines/shoveAPennyRanking.ts', {'./shoveAPennyTargets':targets});
const bot = moduleAt('src/lib/gameEngines/shoveBotAccuracy.ts');
const engine = moduleAt('src/lib/gameEngines/wave61Engine.ts',{
  '../../games/dartsWave61Families': {getWave61Preset:()=>({family:'score',minPlayers:2,defaultRounds:60,defaultGoal:21,defaultLives:0,targetDriven:false,label:'Score',accent:'#fabd49'})},
  './shoveAPennyTargets':targets,
  './shoveBotAccuracy':bot,
  './shoveAPennyRanking':ranking,
});
const players = [{id:'p1',name:'Alpha'},{id:'p2',name:'Bravo'},{id:'p3',name:'Charlie'}];
const start = (opts={}, count=2, rounds=6)=>engine.createWave61State(players.slice(0,count),'shove_a_penny',{rounds,randomOrder:false,modeOptions:{ruleSet:'traditional',marksPerBox:3,overflowRule:1,endMode:'fixed_rounds',...opts}});
const d=(bed,number)=>number===undefined?{bed}:{bed,number};
const hit=(s,...darts)=>engine.playWave61Visit(s,darts);
const fill=(marks, last=1)=>{for(let sector=1;sector<=9;sector++)marks[String(sector)]=3;marks[String(last)]=2;};

// Stable tie-breaker must match the end-panel/history order.
let timed = start({},2,1);
timed.special.shoveMarksByPlayer.p1['1']=1;
timed.special.shoveMarksByPlayer.p2['1']=1;
timed.statsByPlayer.p1.darts=6;
timed.statsByPlayer.p2.darts=3;
timed=hit(timed,d('MISS'),d('MISS'),d('MISS'));
timed=hit(timed,d('MISS'),d('MISS'),d('MISS'));
assert.equal(timed.phase,'finished');
assert.equal(timed.winnerId,'p2','lower real dart count wins an exact marks tie');
assert.equal(ranking.rankShovePlayers(timed)[0],timed.winnerId,'winner and ranking agree');

// A player who closes everything must not keep recording fictitious darts
// during the remaining fixed rounds.
let fixed = start({},2,2);
fill(fixed.special.shoveMarksByPlayer.p1);
fixed=hit(fixed,d('S',1));
assert.equal(fixed.phase,'playing');
assert.equal(fixed.players[fixed.activePlayerIndex].id,'p2');
fixed=hit(fixed,d('MISS'),d('MISS'),d('MISS'));
assert.equal(fixed.players[fixed.activePlayerIndex].id,'p2','closed p1 must be skipped');
assert.equal(fixed.statsByPlayer.p1.darts,1);
fixed=hit(fixed,d('MISS'),d('MISS'),d('MISS'));
assert.equal(fixed.phase,'finished');
assert.equal(fixed.winnerId,'p1');
assert.equal(fixed.statsByPlayer.p1.visits,1,'closed player has exactly one real visit');

let early = start({},2,9);
fill(early.special.shoveMarksByPlayer.p1);
fill(early.special.shoveMarksByPlayer.p2);
early=hit(early,d('S',1));
early=hit(early,d('S',1));
assert.equal(early.phase,'finished','everyone complete ends early despite round cap');
assert.equal(early.winnerId,'p1');

// Surplus falls through a full opponent's sector, not into the void.
let gift=start({},3);
gift.special.shoveMarksByPlayer.p1['1']=2;
gift.special.shoveMarksByPlayer.p2['1']=3;
gift=hit(gift,d('T',1));
assert.equal(gift.special.shoveMarksByPlayer.p3['1'],2,'gift should skip closed p2');
assert.equal(gift.progress.p3,2,'recipient progress reflects gifted marks');

// Cannot win from a gifted last mark: offer to a different legal recipient.
let lastGift=start({},3);
lastGift.special.shoveMarksByPlayer.p1['1']=2;
fill(lastGift.special.shoveMarksByPlayer.p2);
lastGift=hit(lastGift,d('T',1));
assert.equal(lastGift.special.shoveMarksByPlayer.p2['1'],2);
assert.equal(lastGift.special.shoveMarksByPlayer.p3['1'],2);
assert.notEqual(lastGift.winnerId,'p2');

// Full ranking still progresses beyond the first and remains stable after JSON resume.
let complete=start({endMode:'full_ranking'},3);
for(const id of ['p1','p2','p3']) fill(complete.special.shoveMarksByPlayer[id]);
complete=hit(complete,d('S',1));
assert.equal(complete.phase,'playing');
assert.equal(complete.winnerId,'p1');
complete=JSON.parse(JSON.stringify(complete));
complete=hit(complete,d('S',1));
assert.equal(complete.phase,'playing');
complete=hit(complete,d('S',1));
assert.equal(complete.phase,'finished');
assert.equal(complete.winnerId,'p1');
assert.equal(JSON.stringify(Array.from(complete.special.shoveFinishOrder)),JSON.stringify(['p1','p2','p3']));
assert.equal(JSON.stringify(Array.from(ranking.rankShovePlayers(complete))),JSON.stringify(['p1','p2','p3']));
console.log('✅ SHOVE V145 : winners/ties, limited rounds, true darts, gift routing and History-style JSON resume.');
