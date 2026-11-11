/** V221 — isolation des brouillons par compte, reprise legacy explicite, quatre modes. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  readDartsMatchDraft, writeDartsMatchDraft, clearDartsMatchDraft,
  hasUnassignedLegacyDartsMatchDraft, claimLegacyDartsMatchDraft,
} from '../src/lib/dartsMatchDrafts.ts';

class LocalStorageMock {
  data = new Map();
  limit = Infinity;
  getItem(k) { return this.data.get(k) ?? null; }
  setItem(k, v) { if (String(v).length > this.limit) throw Error('QuotaExceeded'); this.data.set(k, String(v)); }
  removeItem(k) { this.data.delete(k); }
}
globalThis.localStorage = new LocalStorageMock();
const modes = ['five_lives', 'chase', 'halve_it', 'split_score'];
for (const mode of modes) {
  assert.equal(writeDartsMatchDraft(mode,{id:'A-'+mode},{turnIndex:2},'account-A'),true);
  assert.equal(writeDartsMatchDraft(mode,{id:'B-'+mode},{turnIndex:4},'account-B'),true);
  assert.equal(readDartsMatchDraft(mode,'account-A').config.id,'A-'+mode);
  assert.equal(readDartsMatchDraft(mode,'account-B').config.id,'B-'+mode);
  assert.equal(readDartsMatchDraft(mode),null,'le compte connecté ne crée aucune clé non attribuée');
}
clearDartsMatchDraft('chase','account-A');
assert.equal(readDartsMatchDraft('chase','account-A'),null);
assert.equal(readDartsMatchDraft('chase','account-B').config.id,'B-chase');
assert.equal(readDartsMatchDraft('five_lives','account-A').config.id,'A-five_lives');

assert.equal(writeDartsMatchDraft('chase',{id:'legacy-1'},{events:[1]}),true);
assert.equal(readDartsMatchDraft('chase','account-A'),null,'aucune reprise automatique d’un autre compte');
assert.equal(hasUnassignedLegacyDartsMatchDraft('chase','account-A'),true);
assert.equal(claimLegacyDartsMatchDraft('chase','account-A'),true,'transfert après action explicite');
assert.equal(readDartsMatchDraft('chase','account-A').config.id,'legacy-1');
assert.equal(readDartsMatchDraft('chase'),null,'ancienne clé nettoyée après transfert réussi');
assert.equal(readDartsMatchDraft('chase','account-B').config.id,'B-chase');
assert.equal(claimLegacyDartsMatchDraft('chase','account-B'),false,'ne jamais écraser le brouillon existant');

assert.equal(writeDartsMatchDraft('split_score',{id:'legacy-split'},{round:4}),true);
assert.equal(hasUnassignedLegacyDartsMatchDraft('split_score','account-C'),true);
localStorage.limit=1;
assert.equal(claimLegacyDartsMatchDraft('split_score','account-C'),false,'rejet si quota dépassé');
assert.equal(readDartsMatchDraft('split_score').config.id,'legacy-split','l’original n’est jamais perdu');
localStorage.limit=Infinity;
assert.equal(claimLegacyDartsMatchDraft('split_score','account-C'),true);
assert.equal(readDartsMatchDraft('split_score','account-C').snapshot.round,4);

// Clé encodée : les ids contenant slash, @ ou caractères accentués ne se croisent pas.
assert.equal(writeDartsMatchDraft('halve_it',{id:'special'},{round:1},'fr/é@example.com'),true);
assert.equal(readDartsMatchDraft('halve_it','fr/é@example.com').config.id,'special');
assert.equal(readDartsMatchDraft('halve_it','fr@example.com'),null);

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const code=(f)=>readFileSync(resolve(root,f),'utf8');
for (const f of ['src/pages/FiveLivesPlay.tsx','src/pages/HalveItPlay.tsx']) {
  const src=code(f);
  assert.match(src,/readDartsMatchDraft\([^\n]+getStorageUser\(\)\)/);
  assert.match(src,/clearDartsMatchDraft\([^\n]+getStorageUser\(\)\)/);
  assert.match(src,/writeDartsMatchDraft\([\s\S]*?\}, getStorageUser\(\)\)/);
}
for (const f of ['src/pages/FiveLivesConfig.tsx','src/pages/HalveItConfig.tsx'])
  assert.match(code(f),/clearDartsMatchDraft\([^\n]+getStorageUser\(\)\)/);
assert.match(code('src/components/DartsResumeDraftCard.tsx'),/claimLegacyDartsMatchDraft/);
assert.match(code('src/components/DartsResumeDraftCard.tsx'),/window\.confirm/);
console.log('PASS V221 — 4 modes, 2 comptes, aucune fuite, reprise legacy volontaire, quota, non-écrasement, intégration UI');
