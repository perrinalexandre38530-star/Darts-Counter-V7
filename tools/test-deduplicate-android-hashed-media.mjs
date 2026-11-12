import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { deduplicateAndroidHashedMedia } from './deduplicate-android-hashed-media.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mss-android-dedupe-'));
const dist = path.join(root, 'dist');
const assets = path.join(dist, 'assets');
fs.mkdirSync(assets, { recursive: true });
const a = 'icon-alpha-Ab12_cd3.png';
const b = 'icon-beta-Pq12_ab3.png';
const c = 'unreferenced-Qa11_ab2.png';
const plain = 'unhashed.png';
const body = Buffer.from('exact-duplicate-binary-content-for-android-test-'.repeat(30));
try {
  for (const name of [a, b, c, plain]) fs.writeFileSync(path.join(assets, name), body);
  fs.writeFileSync(path.join(dist, 'index.html'), '<img src="/assets/' + a + '">');
  fs.writeFileSync(path.join(assets, 'main.js'), 'export default ["/assets/' + a +
    '","/assets/' + b + '"];');
  fs.writeFileSync(path.join(assets, 'main.js.map'), JSON.stringify({ sources: [a, b] }));
  const result = deduplicateAndroidHashedMedia({ dist, minBytes: 0 });
  assert.equal(result.grouped, 1, 'only referenced, duplicate hashed media may be removed');
  assert.equal(result.savedBytes, body.length);
  assert(fs.existsSync(path.join(assets, a)), 'canonical file must remain');
  assert(!fs.existsSync(path.join(assets, b)), 'duplicate file should be deleted');
  assert(fs.existsSync(path.join(assets, c)), 'unreferenced file must remain');
  assert(fs.existsSync(path.join(assets, plain)), 'unhashed file must remain');
  for (const file of ['assets/main.js', 'assets/main.js.map']) {
    const content = fs.readFileSync(path.join(dist, file), 'utf8');
    assert(content.includes(a), file + ' canonical reference absent');
    assert(!content.includes(b), file + ' references deleted file');
  }
  assert.deepEqual(fs.readFileSync(path.join(assets, a)), body, 'dedup must be byte-for-byte lossless');
  console.log('OK Android dedupe: exact bytes, compiled references, safe exclusions');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
