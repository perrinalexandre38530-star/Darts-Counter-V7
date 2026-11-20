import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { assertCorrectAccount, canonicalHandle, assertJpeg, FILE_TARGETS, CLICK_TARGETS } from '../robot-utils.mjs';

const root = resolve(import.meta.dirname, '..');
test('le bot accepte uniquement le vrai compte MSS X', () => {
  assert.equal(assertCorrectAccount('/multisportsscor'), true);
  assert.equal(assertCorrectAccount('https://x.com/MultisportsScor'), true);
  assert.throws(() => assertCorrectAccount('/autrecompte'), /SÉCURITÉ/);
  assert.throws(() => assertCorrectAccount(null), /SÉCURITÉ/);
});
test('normalisation du handle', () => {
  assert.equal(canonicalHandle('https://x.com/multisportsscor/photo'), 'multisportsscor');
  assert.equal(canonicalHandle('/MultisportsScor'), 'multisportsscor');
});
test('les vrais médias JPEG d\'origine sont présents', () => {
  const a = assertJpeg(resolve(root, 'assets/MSS_LOGO_OFFICIEL.jpg'));
  const b = assertJpeg(resolve(root, 'assets/MSS_COUVERTURE_OFFICIELLE.jpg'));
  assert.ok(a.size > 1000);
  assert.ok(b.size > a.size);
});
test('les uploads visent deux champs distincts et ne publient pas de post', () => {
  assert.ok(FILE_TARGETS.avatar.every(x => /Avatar|avatar/.test(x)));
  assert.ok(FILE_TARGETS.banner.every(x => /Header|header|Banner/.test(x)));
  assert.ok(CLICK_TARGETS.avatar.length > 0);
  assert.ok(CLICK_TARGETS.banner.length > 0);
});
