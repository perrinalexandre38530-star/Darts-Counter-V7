/**
 * V223 — classement ex aequo et sécurité des fléchettes dans HALVE-IT / SPLIT SCORE.
 * Commande : node --experimental-strip-types tools/test-chase-halveit-ranking-v223.mjs
 */
import assert from 'node:assert/strict';
import { createHalveItState, playHalveItVisit, halveItDartPoints } from '../src/lib/gameEngines/halveItEngine.ts';

const miss = { bed: 'MISS' };
const players = [
  { id: 'a', name: 'A' }, { id: 'b', name: 'B' },
  { id: 'c', name: 'C' }, { id: 'd', name: 'D' },
];
const rules = {
  participantMode: 'players', sequencePreset: 'classic7', customTargets: ['n20'],
  startMode: 'fixed', fixedStartingScore: 40, rounding: 'floor',
};
let state = createHalveItState(players, rules);

// Le moteur refuse une volée contenant une touche inexistante, sans compter
// une fausse touche, créer d'historique ou modifier une sauvegarde de partie.
for (const bad of [
  { bed: 'S', number: 0 }, { bed: 'S', number: 21 },
  { bed: 'D', number: -1 }, { bed: 'T', number: 99 },
  { bed: 'S', number: 1.5 }, { bed: 'S', number: NaN },
  { bed: 'X', number: 20 }, { bed: 'S' }, { bed: 'S', number: '20' },
]) {
  assert.equal(halveItDartPoints(bad), 0);
  assert.strictEqual(playHalveItVisit(state, [bad, miss, miss]), state,
    `Volée invalide refusée: ${JSON.stringify(bad)}`);
}
assert.equal(state.history.length, 0);
assert.equal(state.scoresByPlayer.a, 40);

// Égalité pour les places suivantes : deux joueurs terminent troisièmes.
for (const darts of [
  [{ bed: 'S', number: 20 }, miss, miss],
  [{ bed: 'D', number: 20 }, miss, miss],
  [miss, miss, miss], [miss, miss, miss],
]) state = playHalveItVisit(state, darts);
assert.equal(state.finished, true);
// D20 vaut 40, donc B seul est premier (80), A deuxième (60), C/D troisièmes (20).
assert.deepEqual(state.standings.map((row) => [row.id, row.rank, row.tied]), [
  ['b', 1, false], ['a', 2, false], ['c', 3, true], ['d', 3, true],
]);
assert.deepEqual(state.winnerIds, ['b']);

// Deux premiers ex aequo et deux troisièmes ex aequo : 1, 1, 3, 3.
let doubleTie = createHalveItState(players, rules);
for (const darts of [
  [{ bed: 'S', number: 20 }, miss, miss],
  [{ bed: 'S', number: 20 }, miss, miss],
  [miss, miss, miss], [miss, miss, miss],
]) doubleTie = playHalveItVisit(doubleTie, darts);
assert.deepEqual(doubleTie.standings.map((r) => r.rank), [1, 1, 3, 3]);
assert.ok(doubleTie.standings.every((r) => r.tied));
assert.deepEqual(doubleTie.winnerIds, ['a', 'b']);
assert.equal(doubleTie.tied, true);

// Trois joueurs terminent exactement au même score : trois vrais premiers.
let shared = createHalveItState(players.slice(0, 3), rules);
for (let i = 0; i < 3; i++) shared = playHalveItVisit(shared, [miss, miss, miss]);
assert.deepEqual(shared.standings.map((r) => r.rank), [1, 1, 1]);
assert.ok(shared.standings.every((r) => r.tied));
assert.equal(shared.tied, true);
assert.deepEqual(shared.winnerIds, ['a', 'b', 'c']);

// Rangs partagés aussi en compétition par équipes.
let teams = createHalveItState(players.slice(0, 3), { ...rules, participantMode: 'teams' }, [
  { id: 'red', name: 'Rouge', playerIds: ['a'] },
  { id: 'blue', name: 'Bleu', playerIds: ['b'] },
  { id: 'green', name: 'Vert', playerIds: ['c'] },
]);
for (let i = 0; i < 3; i++) teams = playHalveItVisit(teams, [miss, miss, miss]);
assert.deepEqual(teams.standings.map((r) => r.rank), [1, 1, 1]);
assert.deepEqual(teams.winnerIds, ['blue', 'red', 'green']); // tri alphabétique des noms en locale FR
assert.equal(teams.tied, true);

// Les scores valides restent inchangés : DBULL 50 et triple 20 = 60.
assert.equal(halveItDartPoints({ bed: 'IB' }), 50);
assert.equal(halveItDartPoints({ bed: 'T', number: 20 }), 60);
console.log('PASS V223 — rangs ex aequo joueurs/équipes et volées invalides refusées');
