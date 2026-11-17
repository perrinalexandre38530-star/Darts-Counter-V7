/**
 * Test réel du moteur du Mexicain (sans navigateur) :
 * node tools/test-mexicain-regression-v175.cjs
 * Dépend de la dépendance de développement `typescript` déjà utilisée par MSS.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
Module._extensions['.ts'] = (mod, file) => {
  const source = fs.readFileSync(file,'utf8');
  const transpiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  mod._compile(transpiled,file);
};
const { createWave61State, playWave61Visit, cloneWave61State } = require('../src/lib/gameEngines/wave61Engine.ts');
const p = [{id:'a',name:'Alpha'},{id:'b',name:'Bravo'},{id:'c',name:'Charlie'}];
const hit=(n,bed='S')=>({number:n,bed});
const misses=[{bed:'MISS'},{bed:'MISS'},{bed:'MISS'}];
function start(players, modeOptions) {
  return createWave61State(players,'mexicain',{
    selectedIds:players.map(p=>p.id),players:players.length,playersList:players,
    rounds:60, modeOptions:{targetMode:'fixed',fixedTarget:16,bullEnabled:'no',progressive:'classic',...modeOptions}
  });
}
function turn(state,darts) { return playWave61Visit(state,darts); }
{
  let s=start(p.slice(0,2));
  assert.equal(s.special.mexicainTargets[0],16,'cible imposée');
  const init=cloneWave61State(s);
  s=turn(s,[hit(16),hit(16,'D'),hit(16,'T')]);
  assert.equal(s.scores.a,96,'S16+D16+T16');
  assert.equal(s.special.mexicainRoundScores.a,96);
  assert.equal(init.scores.a,0,'snapshot d’UNDO immuable');
  s=turn(s,misses);
  assert.equal(s.roundIndex,1);
  assert.deepEqual(s.special.mexicainHistory[0].scores,[{id:'a',score:96},{id:'b',score:0}]);
  assert.deepEqual(s.special.mexicainHistory[0].losers,['b']);
  assert.equal(s.lives.b,2);
  for(let i=0;i<2;i++){s=turn(s,[hit(16),hit(16,'D'),hit(16,'T')]);s=turn(s,misses)}
  assert.equal(s.phase,'finished','victoire par survie');
  assert.equal(s.winnerId,'a');
  assert.equal(s.special.mexicainHistory.length,3);
}
{
  let s=start(p.slice(0,2));
  s=turn(s,misses); s=turn(s,misses);
  assert.equal(s.special.mexicainHistory[0].losers.length,0,'égalité générale');
  assert.deepEqual([s.lives.a,s.lives.b],[3,3]);
}
{
  let s=start(p);
  s=turn(s,[hit(16),hit(16),hit(16)]);s=turn(s,misses);s=turn(s,misses);
  assert.deepEqual(s.special.mexicainHistory[0].losers,['b','c'],'égalité en dernier rang');
  assert.equal(s.lives.a,3);assert.equal(s.lives.b,2);assert.equal(s.lives.c,2);
}
{
  let s=start(p.slice(0,2),{progressive:'survival',targetMode:'fixed',fixedTarget:21,bullEnabled:'yes'});
  assert.equal(s.lives.a,5);assert.equal(s.lives.b,5);
  s=turn(s,[{bed:'OB'},{bed:'IB'},{bed:'MISS'}]);
  assert.equal(s.scores.a,75,'BULL25 + BULL50');
  s=turn(s,misses);
  assert.equal(s.special.mexicainHistory[0].target,21);
  assert.equal(s.lives.b,4);
}
{
  let s=start(p.slice(0,2),{progressive:'progressive'});
  for(let i=0;i<6;i++){s=turn(s,[hit(16),hit(16),hit(16)]);s=turn(s,misses);if(s.phase==='finished')break}
  assert.equal(s.special.mexicainHistory[0].lifeLoss,1);
}
console.log('✅ MEXICAIN : cibles, scoring S/D/T et BULL, égalités, pertes de vies, victoire, UNDO et historique OK');

// Full match with a bot: the AI always aims at the same target as the human.
{
  const {pickWave61BotDarts}=require('../src/lib/gameEngines/wave61Engine.ts');
  let s=start([{id:'human',name:'Human'},{id:'cpu',name:'CPU'}], {fixedTarget:16,progressive:'survival'});
  let safety=0;
  while(s.phase==='playing' && safety++<80){
    const acting=s.players[s.activePlayerIndex].id;
    const shots=acting==='cpu'?pickWave61BotDarts(s,'hard',5):misses;
    assert.equal(shots.length,3, 'each bot turn produces three impacts');
    s=turn(s,shots);
  }
  assert(safety<=80, 'bot match terminates');
  assert.equal(s.phase,'finished');
  assert.equal(s.special.mexicainHistory.length,s.roundIndex + 1,'last completed round preserved');
  assert(s.visits.length>=2, 'history of visits remains present');
}

// Interruption and resume: serialized state must keep round target, lives, scores.
{
  let s=start(p,{targetMode:'fixed',fixedTarget:18});
  s=turn(s,[hit(18),hit(18,'D'),hit(18,'T')]);
  const resumed=cloneWave61State(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(resumed.special.mexicainRoundScores,s.special.mexicainRoundScores);
  assert.equal(resumed.activePlayerIndex,s.activePlayerIndex);
  assert.equal(resumed.special.mexicainTargets[resumed.roundIndex],18);
  s=turn(resumed,misses); s=turn(s,misses);
  assert.equal(s.special.mexicainHistory[0].scores.length,3);
  assert.deepEqual(s.special.mexicainHistory[0].losers,['b','c']);
}

// Max-round resolution: lives outrank cumulative points when no one is eliminated.
{
  let s=createWave61State(p.slice(0,2),'mexicain',{
    selectedIds:['a','b'],players:2,rounds:1,randomOrder:false,
    modeOptions:{targetMode:'fixed',fixedTarget:16,progressive:'classic',bullEnabled:'no'}
  });
  s=turn(s,[hit(16),hit(16,'D'),hit(16,'T')]);
  s=turn(s,misses);
  assert.equal(s.phase,'finished');
  assert.equal(s.winnerId,'a');
  assert.equal(s.special.mexicainHistory.length,1);
  // At this point a has 3 lives / 96 points and b has 2 lives / 0 points.
}

// A high historical score must never win over more lives at the round cap.
{
  let s=createWave61State(p.slice(0,2),'mexicain',{
    selectedIds:['a','b'],players:2,rounds:1,randomOrder:false,
    modeOptions:{targetMode:'fixed',fixedTarget:16,progressive:'classic',bullEnabled:'no'}
  });
  s.scores.a=900;
  s.lives.a=1;
  s.lives.b=3;
  s=turn(s,misses);s=turn(s,misses);
  assert.equal(s.phase,'finished');
  assert.equal(s.winnerId,'b','survival ranking: remaining lives trump points');
}

// Capped match with equal lives: cumulative points decide the winner.
{
  let s=createWave61State(p.slice(0,2),'mexicain',{
    selectedIds:['a','b'],players:2,rounds:1,randomOrder:false,
    modeOptions:{targetMode:'fixed',fixedTarget:16,progressive:'classic',bullEnabled:'no'}
  });
  s.scores.a=15;s.scores.b=40;
  s=turn(s,misses);s=turn(s,misses);
  assert.equal(s.winnerId,'b','equal lives: cumulative points break the tie');
}

console.log('✅ MEXICAIN V175 : bots, reprise JSON, manches complètes et fin à la limite OK');

// Rankings reconstructed for the public per-round dashboard must follow the
// same rule as the engine: surviving lives first, then cumulative points.
{
  const { buildMexicainRoundStandings } = require('../src/lib/gameEngines/mexicainStandings.ts');
  const history = [
    {round:1,target:16,scores:[{id:'a',score:96},{id:'b',score:0},{id:'c',score:20}],losers:['b'],lifeLoss:1},
    {round:2,target:12,scores:[{id:'a',score:0},{id:'b',score:36},{id:'c',score:12}],losers:['a'],lifeLoss:1},
    {round:3,target:20,scores:[{id:'a',score:0},{id:'b',score:60},{id:'c',score:20}],losers:['a'],lifeLoss:1},
  ];
  const rounds=buildMexicainRoundStandings(p,history,3);
  assert.deepEqual(rounds[0].standings.map(s=>s.playerId),['a','c','b']);
  assert.deepEqual(rounds[1].standings.map(s=>s.playerId),['c','a','b']);
  assert.deepEqual(rounds[2].standings.map(s=>s.playerId),['c','b','a'], 'highest historic score must not outrank extra life');
  assert.equal(rounds[2].standings.find(s=>s.playerId==='a').lives,1);
  assert.equal(rounds[2].standings.find(s=>s.playerId==='b').totalPoints,96);
  const original=JSON.stringify(history);
  buildMexicainRoundStandings(p,history,3);
  assert.equal(JSON.stringify(history),original,'historical statistics never mutate source');
  assert.deepEqual(buildMexicainRoundStandings(p,[],3),[]);
}
console.log('✅ MEXICAIN V178 : classement historique de survie, égalités et source immuable OK');
