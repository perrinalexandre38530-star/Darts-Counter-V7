/** V205: History V4 legacy outcomes — no winnerId does not imply a draw. */
import assert from 'node:assert/strict';
import { computeTop10MorpionStats } from '../src/lib/top10MorpionStats.ts';

const players = [{ id: 'alice', name: 'Alice' }, { id: 'bob', name: 'Bob' }];
const top = (id, a, b, extra = {}) => ({
  id, matchId:id, mode:'top_10', status:'finished', players:players.map(p=>({...p})),
  payload: { visitScores: [a,b] }, summary: { finished:true }, ...extra,
});
const ten = n => Array(10).fill(n);
const morpion = (id, wins, extra = {}) => ({
  id, matchId:id, mode:'tic_tac_toe', status:'finished', players:players.map(p=>({...p})),
  payload:{ matchWins:wins, grid:{owners:Array(9).fill(null), marks:Array.from({length:9},()=>[0,0])}},
  summary:{ finished:true }, ...extra,
});
const cases = [
  top('t-winner',ten(60),ten(40)),        // missing winnerId, provable winner
  top('t-tie',ten(50),ten(50)),           // genuine equal score
  top('t-unknown',[],[]),                // finished legacy but no trustworthy result
  top('t-lost',ten(25),ten(100)),        // genuine loss
  top('t-explicit',[],[],{winnerId:'alice'}),
  morpion('m-winner',[2,0]),
  morpion('m-draw',[1,1]),
  morpion('m-unknown',[],{}),
];
const initial = JSON.stringify(cases);
let s = computeTop10MorpionStats(cases,'alice','top_10');
assert.equal(s.games,5);
assert.equal(s.competitiveGames,5);
assert.equal(s.knownCompetitiveGames,4);
assert.equal(s.victories,2);
assert.equal(s.defeats,1);
assert.equal(s.draws,1);
assert.equal(s.unknownResults,1);
assert.equal(s.knownCompetitiveGames, s.victories+s.defeats+s.draws);
assert.equal(JSON.stringify(cases), initial, 'statistics never mutate History V4');
const solo={...top('solo',ten(50),[]),players:[players[0]],payload:{visitScores:[ten(50)]},winnerId:'alice'};
s=computeTop10MorpionStats([solo],'alice','top_10');
assert.equal(s.soloGames,1);assert.equal(s.victories,0);assert.equal(s.knownCompetitiveGames,0);
s=computeTop10MorpionStats(cases,'alice','tic_tac_toe');
assert.equal(s.games,3);
assert.equal(s.victories,1);assert.equal(s.draws,1);assert.equal(s.unknownResults,1);
// Real classic finished records with scores but without winnerId.
const summaryOnly=top('t-summary',[],[],{summary:{finished:true,finalScores:{alice:300,bob:250}}});
s=computeTop10MorpionStats([summaryOnly], 'alice','top_10');assert.equal(s.victories,1);
const absent=top('t-no-score',[],[],{players:[{id:'alice'},{id:'bob'}]});
s=computeTop10MorpionStats([absent], 'alice','top_10');assert.equal(s.draws,0);assert.equal(s.unknownResults,1);
const active={...top('t-active',ten(30),ten(15)),status:'in_progress'};
s=computeTop10MorpionStats([active], 'alice','top_10');assert.equal(s.games,0);
console.log('PASS V205 — completed results, legacy winner inference, real draws, unknowns, solo, immutable History V4.');
