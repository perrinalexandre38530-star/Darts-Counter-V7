/** V218 — anti-faux vainqueur dans les résultats TOP 10 / Morpion.
 * Lit les vrais moteurs, sans modifier l'Historique ni le stockage local. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { computeTop10MorpionStats } from '../src/lib/top10MorpionStats.ts';
import { morpionWinner, morpionIsDraw } from '../src/lib/morpionEngine.ts';
import { resolveMorpionFormat } from '../src/lib/morpionMatchFormat.ts';

const users = [
  { id: 'alice', name: 'Alice', isBot: false, score: 0 },
  { id: 'bob', name: 'Bob', isBot: false, score: 0 },
];
const low = Array(10).fill(20);
const high = Array(10).fill(60);
function top(id, extra={}) {
  const scores = [low, high];
  const visits = Array.from({length:20}, (_, i) => ({ playerId:users[i % 2].id, score: i % 2 ? 60 : 20 }));
  return {
    id, matchId:id, kind:'top_10', mode:'top_10', status:'finished',
    finishedAt:1720000000000, players:structuredClone(users),
    payload: {visitScores:scores, roundIdx:10, currentPlayerIndex:0, visits},
    summary:{finished:true, finalScores:{alice:200,bob:600}},
    ...extra,
  };
}
const good = top('consistent', {winnerId:'bob'});
const missing = top('missing');
const falseWinner = top('wrong-winner', {winnerId:'alice'});
const falseDraw = top('wrong-draw', {summary:{finished:true, draw:true, finalScores:{alice:200,bob:600}}});
const legacy = top('legacy', {winnerId:'alice', payload:{visits:[]}, summary:{finished:true}});
const records=[good,missing,falseWinner,falseDraw,legacy];
const before=JSON.stringify(records);
const stats=computeTop10MorpionStats(records, 'alice', 'top_10');
assert.equal(stats.games,5);
assert.equal(stats.knownCompetitiveGames,3);
assert.equal(stats.defeats,2, 'scores vérifiables: Alice a perdu 2 parties');
assert.equal(stats.victories,1, 'ancien winnerId sans score vérifiable reste pris en charge');
assert.equal(stats.draws,0);
assert.equal(stats.unknownResults,2, 'contradictions: ni victoire ni nul inventés');
assert.equal(JSON.stringify(records),before,'History V4 ne doit jamais être modifié');

const morpion={
  id:'m-wrong', mode:'tic_tac_toe', status:'finished', winnerId:'alice',
  players:structuredClone(users), payload:{matchWins:[1,2]}, summary:{finished:true},
};
const m=computeTop10MorpionStats([morpion], 'alice','tic_tac_toe');
assert.equal(m.unknownResults,1,'vainqueur contradictoire au Morpion');
assert.equal(m.victories,0);

// Le moteur de reprise est vérifié directement sur un enregistrement complet,
// sans navigateur et sans création de partie ni side effect.
const require=createRequire(import.meta.url);
const ts=require(process.env.TYPESCRIPT_PATH || 'typescript');
const transpiled=ts.transpileModule(readFileSync('src/lib/recoverTop10Morpion.ts','utf8'),{
  compilerOptions:{ module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022 }, reportDiagnostics:true,
});
assert.equal(transpiled.diagnostics?.length??0,0);
const exports={};
runInNewContext(transpiled.outputText, {
  exports, require:(name)=>{
    if(name==='./morpionEngine')return { morpionWinner,morpionIsDraw };
    if(name==='./morpionMatchFormat')return { resolveMorpionFormat };
    throw new Error('Unexpected import '+name);
  }, Date,Number,String,Math,Object,Array,Set,
});
const {recoverTop10}=exports;
assert.equal(recoverTop10(falseWinner,{preview:true}),null,'aperçu d’un faux vainqueur refusé');
assert.ok(recoverTop10(good,{preview:true}),'aperçu du vrai gagnant autorisé');
assert.ok(recoverTop10(missing,{preview:true}),'ancienne partie sans winnerId consultable');
assert.equal(recoverTop10(good),null,'une partie terminée n’est jamais rejouable');
const active={...top('ongoing',{status:'in_progress',winnerId:null,finishedAt:undefined}),
  payload:{visitScores:[[20],[60]],roundIdx:1,currentPlayerIndex:0,
  visits:[{playerId:'alice',score:20},{playerId:'bob',score:60}]},
  summary:{finished:false}};
assert.ok(recoverTop10(active),'une partie encore en cours reste reprenable');
console.log('PASS V218 — résultats contradictoires exclus des taux, aperçus TOP 10 protégés, legacy conservé.');
