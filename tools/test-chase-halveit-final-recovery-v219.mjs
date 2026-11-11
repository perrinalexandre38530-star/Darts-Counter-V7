import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  stagePendingDartsFinalResult,
  listPendingDartsFinalResults,
  recoverPendingDartsFinalResult,
  clearPendingDartsFinalResult,
} from '../src/lib/dartsPendingFinalResults.ts';

class StorageMock {
  data = new Map();
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}
globalThis.localStorage = new StorageMock();
globalThis.window = { dispatchEvent() {} };
const makeMatch = (id, kind, variantId) => ({
  id, kind, status: 'finished', players: [{ id: 'p1', name: 'Joueur 1', avatarDataUrl: 'data:image/png;base64,verybig' }],
  summary: { winnerId: 'p1', visits: 8 }, payload: { variantId, visits: [{ score: 85 }] },
});
for (const [i, mode] of ['five_lives','chase','halve_it','split_score'].entries()) {
  const id = `result-${i}`;
  assert.equal(stagePendingDartsFinalResult(mode, makeMatch(id, mode), 'user-one'), true);
  const list = listPendingDartsFinalResults('user-one');
  assert.equal(list.length, i + 1);
  assert.equal(list[0].record.players[0].avatarDataUrl, null, 'pas de media dans le secours');
}
assert.equal(listPendingDartsFinalResults('user-two').length, 0, 'isolation des comptes');
assert.equal(stagePendingDartsFinalResult('chase', makeMatch('result-1','chase'), 'user-one'), true);
assert.equal(listPendingDartsFinalResults('user-one').length, 4, 'pas de doublon par ID');
assert.equal(stagePendingDartsFinalResult('chase', makeMatch('result-1','chase'), 'user-two'), true);
assert.equal(listPendingDartsFinalResults('user-two').length, 1);
const id = 'result-1';
let attempts = 0;
const failed = await recoverPendingDartsFinalResult(id, 'user-one', async () => { attempts++; throw new Error('IDB unavailable'); });
assert.equal(failed, false);
assert.equal(listPendingDartsFinalResults('user-one').length, 4, 'conserver le secours si échec');
let release;
const unresolved = new Promise(resolve => { release = resolve; });
const first = recoverPendingDartsFinalResult(id, 'user-one', async (rec) => { attempts++; assert.equal(rec.id,id); await unresolved; return true; });
const duplicate = recoverPendingDartsFinalResult(id, 'user-one', async () => { attempts++; return true; });
assert.strictEqual(first, duplicate, 'une seule tentative concurrente');
release();
assert.equal(await first, true);
assert.equal(attempts, 2);
assert.equal(listPendingDartsFinalResults('user-one').length, 3);
assert.equal(listPendingDartsFinalResults('user-two').length, 1, 'ne jamais toucher un autre compte');
assert.equal(await recoverPendingDartsFinalResult(id, 'user-one', async () => true), false, 'pas de relecture du résultat déjà confirmé');
assert.equal(clearPendingDartsFinalResult('result-2', 'user-one'), true);
assert.equal(listPendingDartsFinalResults('user-one').length, 2);
assert.equal(stagePendingDartsFinalResult('five_lives', makeMatch('bad','five_lives',''), 'user-one'), true);
assert.equal(stagePendingDartsFinalResult('five_lives', { id: 'invalid', status: 'in_progress' }, 'user-one'), false);
assert.equal(stagePendingDartsFinalResult('five_lives', {...makeMatch('too-large','five_lives'), payload:{ visits:'x'.repeat(700000)}}, 'user-one'), false);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = (relative) => readFileSync(resolve(root, relative), 'utf8');
const app = source('src/App.tsx');
assert.match(app, /stagePendingDartsFinalResult\(dartsFinalMode, saved, pendingScope\)/);
assert.match(app, /if \(committed\) clearPendingDartsFinalResult\(String\(saved\.id\), pendingScope\)/);
assert.match(app, /recoverPendingDartsFinalResult\(item\.id, scope/);
assert.match(source('src/pages/FiveLivesConfig.tsx'), /<DartsPendingFinalCard/);
assert.match(source('src/pages/HalveItConfig.tsx'), /<DartsPendingFinalCard/);
assert.match(source('src/pages/StatsHub.tsx'), /readToken !== latestReadToken/);
console.log('PASS V219 - 4 modes, compte, pending, retry, concurrence, crash, limites, UI et History V4');
