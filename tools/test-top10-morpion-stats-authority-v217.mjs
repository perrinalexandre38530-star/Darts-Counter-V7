/** V217 — Scores TOP 10 de sauvegardes anciennes : priorité au résultat final,
 * moyenne calculée uniquement à partir des volées chiffrées et History immuable. */
import assert from 'node:assert/strict';
import { computeTop10MorpionStats } from '../src/lib/top10MorpionStats.ts';

const players = [
  { id: 'alice', name: 'Alice', score: 0 },
  { id: 'bob', name: 'Bob', score: 0 },
];
const base = (id, payload, summary = { finished: true, finalScores: { alice: 650, bob: 500 } }) => ({
  id, matchId: id, mode: 'top_10', status: 'finished', players: structuredClone(players),
  payload, summary,
});
const documented = base('complete', {
  visitScores: [Array(10).fill(40), Array(10).fill(30)],
  visits: Array.from({ length: 10 }, (_, i) => ({ playerId: 'alice', visitIndex: i, score: 40,
    darts: [{score:20}, {score:20}, {score:0}] })),
}, { finished: true, finalScores: {alice: 400, bob: 300} });
const legacy = base('legacy', {}); // Résultat final présent, aucune volée chiffrée
const legacyZero = {...legacy, id: 'legacyZero', matchId: 'legacyZero',
  payload: {visits: Array.from({length:10}, () => ({ playerId:'alice', darts:[{bed:'S'}] }))}};
const partial = base('partial', {visitScores:[[20,30],[10,20]]});
const raw = [documented, legacy, legacyZero, partial];
const before = JSON.stringify(raw);
const onlyLegacy = computeTop10MorpionStats([legacy], 'alice', 'top_10');
assert.equal(onlyLegacy.games, 1);
assert.equal(onlyLegacy.totalPoints, 650, 'summary.finalScores doit primer sur players.score=0');
assert.equal(onlyLegacy.bestGame, 650);
assert.equal(onlyLegacy.victories, 1, 'le vainqueur peut être déterminé depuis les scores finaux');
assert.equal(onlyLegacy.averagePointsPerVisit, null, 'sans détail des volées, aucune moyenne déductible');
const both = computeTop10MorpionStats([documented, legacy], 'alice', 'top_10');
assert.equal(both.totalPoints, 1050);
assert.equal(both.visits, 10);
assert.equal(both.averagePointsPerVisit, 40, 'un total legacy sans volées ne doit pas gonfler la moyenne');
assert.equal(both.bestVisit, 40);
assert.equal(both.bestGame, 650);
const missingScores = computeTop10MorpionStats([legacyZero], 'alice', 'top_10');
assert.equal(missingScores.visits, 10, 'les volées sont validées même si leur score est inconnu');
assert.equal(missingScores.averagePointsPerVisit, null, 'ne pas inventer dix scores à zéro');
assert.equal(missingScores.bestVisit, null);
assert.equal(missingScores.totalPoints, 650);
const partialResult = computeTop10MorpionStats([partial], 'alice', 'top_10');
assert.equal(partialResult.totalPoints, 650, 'deux volées ne valent pas le score final sur 10 volées');
assert.equal(partialResult.visits, 2);
assert.equal(partialResult.averagePointsPerVisit, 25, 'les deux volées connues restent exploitables');
assert.equal(JSON.stringify(raw), before, 'le calcul ne doit jamais muter History V4');
console.log('PASS V217 — scores finaux autoritaires, moyennes documentées, legacy incomplet, History V4 immuable.');
