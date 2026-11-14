import test from 'node:test';
import assert from 'node:assert/strict';
import { assessMain } from './mss-main-guard-core.mjs';
const good = { branch: 'main', localSha: 'a'.repeat(40), remoteSha: 'a'.repeat(40), dirty: false };
test('main propre et commit GitHub identique : accepté', () => assert.equal(assessMain(good).ok, true));
test('branche différente : bloquée', () => assert.equal(assessMain({ ...good, branch: 'feature' }).ok, false));
test('StackBlitz en retard : bloqué', () => assert.equal(assessMain({ ...good, localSha: 'b'.repeat(40) }).ok, false));
test('fichiers locaux modifiés : bloqué', () => assert.equal(assessMain({ ...good, dirty: true }).ok, false));
test('GitHub inaccessible : bloqué', () => assert.equal(assessMain({ ...good, remoteChecked: false, remoteSha: null }).ok, false));
test('référence origin/main périmée : avertissement', () => {
  const result = assessMain({ ...good, trackingKnown: true, trackingSha: 'b'.repeat(40) });
  assert.equal(result.ok, true);
  assert.equal(result.warnings.length, 1);
});
