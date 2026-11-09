import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createConfirmedHistorySaveGate } from '../src/lib/confirmedHistorySave.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const gate = createConfirmedHistorySaveGate();
let callbacks = 0;
let release;
const inFlight = new Promise((resolve) => { release = resolve; });
const first = gate.save('chase-match-1', async () => { callbacks++; return inFlight; });
const concurrent = gate.save('chase-match-1', async () => { callbacks++; return true; });
await Promise.resolve();
assert.equal(callbacks, 1, 'une seule transaction pour les clics simultanés');
assert.strictEqual(first, concurrent, 'promesse partagée pour le même match');
release(true);
assert.equal(await first, true);
assert.equal(gate.isSaved('chase-match-1'), true);
assert.equal(await gate.save('chase-match-1', () => { throw Error('duplicate'); }), true);
assert.equal(callbacks, 1, 'aucun doublon après commit');

let attempts = 0;
assert.equal(await gate.save('split-match-2', async () => { attempts++; throw Error('IDB fail'); }), false);
assert.equal(gate.isSaved('split-match-2'), false, 'l’échec ne marque jamais la partie sauvée');
assert.equal(await gate.save('split-match-2', async () => { attempts++; return false; }), false);
assert.equal(gate.isSaved('split-match-2'), false, 'retour false ne confirme pas');
assert.equal(await gate.save('split-match-2', async () => { attempts++; return true; }), true);
assert.equal(attempts, 3, 'nouvelle tentative possible après échec');
assert.equal(gate.isSaved('split-match-2'), true);
assert.equal(await gate.save('', () => true), false, 'pas de sauvegarde sans ID stable');

const app = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');
const five = readFileSync(resolve(root, 'src/pages/FiveLivesPlay.tsx'), 'utf8');
const halve = readFileSync(resolve(root, 'src/pages/HalveItPlay.tsx'), 'utf8');
assert.match(app, /return upsertPromise;\s*}\s*\/\/ ONLINE V10/, 'callback remonte le résultat IDB');
assert.match(app, /const confirmBeforeMirror = isTossitMatch \|\| options\?\.confirmPersistence === true;/, 'TOSSIT et V217 attendent tous deux le commit');
assert.match(app, /if \(!confirmBeforeMirror\) updateVisibleHistory\(\)/, 'cache optimiste conservé pour les autres modes');
assert.match(app, /if \(committed\) updateVisibleHistory\(\)/);
for (const [name, source] of [['5 VIES / CHASE', five], ['HALVE-IT / SPLIT SCORE', halve]]) {
  assert.match(source, /createConfirmedHistorySaveGate/, `${name}: dédoublonnage`);
  assert.match(source, /confirmPersistence: true/, `${name}: demande confirmation`);
  assert.match(source, /setSaveStatus\(confirmed \? "saved" : "failed"\)/, `${name}: statut confirmé`);
  assert.match(source, /saveStatus === "failed"/, `${name}: retry visible`);
  assert.match(source, /if \(saveStatus === "saved"\) clearDartsMatchDraft/, `${name}: brouillon conservé après échec`);
}
console.log('PASS V217 — sérialisation, échec, nouvelle tentative, confirmation, absence de doublons et câblage des 4 modes');
