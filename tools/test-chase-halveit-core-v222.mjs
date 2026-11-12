/**
 * V222 — recette déterministe sans navigateur, sur le moteur réel et les
 * sauvegardes locales, pour HALVE-IT / SPLIT SCORE et leurs modes associés.
 * Commande: node --experimental-strip-types tools/test-chase-halveit-core-v222.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createHalveItState, cloneHalveItState, playHalveItVisit,
  halveItTargetScore, targetFromId,
} from '../src/lib/gameEngines/halveItEngine.ts';
import {
  writeDartsMatchDraft, readDartsMatchDraft, clearDartsMatchDraft,
} from '../src/lib/dartsMatchDrafts.ts';
import { createConfirmedHistorySaveGate } from '../src/lib/confirmedHistorySave.ts';
import {
  stagePendingDartsFinalResult, recoverPendingDartsFinalResult,
  listPendingDartsFinalResults,
} from '../src/lib/dartsPendingFinalResults.ts';

class MemoryStorage {
  map = new Map();
  getItem(key) { return this.map.get(key) ?? null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}
globalThis.localStorage = new MemoryStorage();
globalThis.window = { dispatchEvent() {} };
const miss = { bed: 'MISS' };
const targets = ['n15', 'n16', 'double_any', 'n17', 'n18', 'triple_any', 'n19', 'n20', 'bull'];
const rules = { participantMode: 'players', sequencePreset: 'extended9', customTargets: targets,
  startMode: 'fixed', fixedStartingScore: 40, rounding: 'floor' };
const players = [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }];
let split = createHalveItState(players, rules);
assert.deepEqual(split.targets.map((target) => target.id), targets);
assert.deepEqual(split.scoresByPlayer, { p1: 40, p2: 40 });

// Le moteur lui-même refuse un nombre de fléchettes incorrect, et ne modifie
// ni son score, ni son état, ni son historique, même sans l'interface.
for (const invalid of [null, [], [miss], [miss, miss], [miss, miss, miss, miss]]) {
  assert.strictEqual(playHalveItVisit(split, invalid), split, 'volée incomplète refusée');
}
assert.equal(split.history.length, 0);
assert.equal(halveItTargetScore(targetFromId('bull'), { bed: 'IB' }), 50);
assert.equal(halveItTargetScore(targetFromId('double_any'), { bed: 'IB' }), 50);

// Première volée + annulation ; après annulation le brouillon du bon compte
// doit être effacé, sans toucher aux sauvegardes d'autres comptes.
const owner = 'compte-A';
let before = cloneHalveItState(split);
let played = playHalveItVisit(split, [{ bed: 'T', number: 15 }, miss, miss]);
assert.equal(played.scoresByPlayer.p1, 85);
assert.equal(played.history.length, 1);
assert.equal(writeDartsMatchDraft('split_score', { sessionId: 'session-1' },
  { state: played, throwDarts: [], multiplier: 1 }, owner), true);
assert.ok(readDartsMatchDraft('split_score', owner));
assert.equal(writeDartsMatchDraft('split_score', { sessionId: 'autre' },
  { state: played, throwDarts: [], multiplier: 1 }, 'compte-B'), true);
split = cloneHalveItState(before); // même opération que la pile ANNULER
assert.equal(split.history.length, 0);
assert.equal(split.scoresByPlayer.p1, 40);
clearDartsMatchDraft('split_score', owner);
assert.equal(readDartsMatchDraft('split_score', owner), null);
assert.ok(readDartsMatchDraft('split_score', 'compte-B'));

// Toute une partie officielle, avec 2 joueurs, 9 manches et classement final.
for (let round = 0; round < 9; round++) {
  for (let player = 0; player < 2; player++) {
    const target = split.targets[round];
    let darts = [miss, miss, miss];
    if (player === 0) {
      if (target.kind === 'number') darts = [{ bed: 'S', number: target.value }, miss, miss];
      if (target.kind === 'double') darts = [{ bed: 'IB' }, miss, miss];
      if (target.kind === 'triple') darts = [{ bed: 'T', number: 20 }, miss, miss];
      if (target.kind === 'bull') darts = [{ bed: 'IB' }, miss, miss];
    }
    split = playHalveItVisit(split, darts);
  }
}
assert.equal(split.finished, true);
assert.equal(split.history.length, 18);
assert.equal(split.roundIndex, 9);
assert.deepEqual(split.winnerIds, ['p1']);
assert.equal(split.scoresByPlayer.p2, 0);
assert.equal(split.statsByPlayer.p1.darts, 27);
assert.equal(split.statsByPlayer.p2.halvingEvents, 9);
assert.equal(split.statsByPlayer.p1.dbulls, 2);
assert.equal(split.statsByPlayer.p1.pointsLostByHalving, 0);
assert.strictEqual(playHalveItVisit(split, [miss, miss, miss]), split,
  'aucune volée additionnelle après FINISH');

// HALVE-IT en équipes, classement établi par somme des coéquipiers.
const teamPlayers = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }];
let halve = createHalveItState(teamPlayers, {
  participantMode: 'teams', sequencePreset: 'classic7', startMode: 'fixed',
  fixedStartingScore: 40, rounding: 'floor',
}, [
  { id: 'rouge', name: 'Rouge', playerIds: ['a', 'b'] },
  { id: 'bleu', name: 'Bleu', playerIds: ['c'] },
]);
while (!halve.finished) {
  const id = halve.turnOrder[halve.activePlayerIndex];
  const target = halve.targets[halve.roundIndex];
  const darts = id === 'c' ? [miss, miss, miss] : target.kind === 'number'
    ? [{ bed: 'S', number: target.value }, miss, miss]
    : target.kind === 'double' ? [{ bed: 'D', number: 20 }, miss, miss]
    : target.kind === 'triple' ? [{ bed: 'T', number: 20 }, miss, miss]
    : [{ bed: 'OB' }, miss, miss];
  halve = playHalveItVisit(halve, darts);
}
assert.equal(halve.history.length, 21);
assert.equal(halve.standings[0].id, 'rouge');
assert.deepEqual(halve.winnerIds, ['rouge']);
assert.equal(halve.statsByPlayer.c.halvingEvents, 7);

// Échec History V4 : le secours reste disponible jusqu'à une vraie confirmation.
const record = { id: 'final-split-v222', mode: 'split_score', kind: 'split_score',
  status: 'finished', payload: { visits: split.history }, winnerId: 'p1' };
assert.equal(stagePendingDartsFinalResult('split_score', record, owner), true);
const gate = createConfirmedHistorySaveGate();
assert.equal(await gate.save(record.id, async () => false), false);
assert.equal(gate.isSaved(record.id), false);
assert.equal(listPendingDartsFinalResults(owner).length, 1);
const confirmed = await recoverPendingDartsFinalResult(record.id, owner,
  async (restoredRecord) => gate.save(record.id, async () => restoredRecord.id === record.id));
assert.equal(confirmed, true);
assert.equal(gate.isSaved(record.id), true);
assert.equal(listPendingDartsFinalResults(owner).length, 0);
assert.equal(listPendingDartsFinalResults('compte-B').length, 0);

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'src/pages/HalveItPlay.tsx'), 'utf8');
assert.match(source,
  /if \(!state\.history\.length && !throwDarts\.length\) \{\s*clearDartsMatchDraft\(draftMode, getStorageUser\(\)\);\s*return;\s*\}/,
  'en cas d’annulation de la première volée, nettoyer le brouillon réel');
console.log('PASS V222 — garde moteur 3 fléchettes, Split Score complet, HALVE-IT équipes, annulation initiale, reprise et confirmation History V4');
