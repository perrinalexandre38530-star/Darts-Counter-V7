import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { convertAndroidGeneratedPng } from './convert-android-generated-png.mjs';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mss-android-webp-test-'));
const dist = path.join(root, 'dist');
const assets = path.join(dist, 'assets');

try {
  fs.mkdirSync(assets, { recursive: true });
  const width = 768;
  const height = 512;
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      pixels[i] = Math.round(125 + 105 * Math.sin(x / 85) * Math.cos(y / 120));
      pixels[i + 1] = Math.round(124 + 100 * Math.cos(x / 137 + y / 99));
      pixels[i + 2] = Math.round(135 + 90 * Math.sin(x / 116 + y / 158));
    }
  }
  const png = await sharp(pixels, { raw: { width, height, channels: 3 } })
    .png({ compressionLevel: 6 }).toBuffer();
  const name = 'hero-Ab12_cd3.png';
  const newName = 'hero-Ab12_cd3.webp';
  const ignored = 'unreferenced-qwER1234.png';
  const plain = 'not-fingerprinted.png';
  fs.writeFileSync(path.join(assets, name), png);
  fs.writeFileSync(path.join(assets, ignored), png);
  fs.writeFileSync(path.join(assets, plain), png);
  fs.writeFileSync(path.join(dist, 'index.html'), '<img src="/assets/' + name + '">');
  fs.writeFileSync(path.join(assets, 'main.js'),
    'export const image="/assets/' + name + '";');
  fs.writeFileSync(path.join(assets, 'main.css'),
    '.banner{background-image:url(/assets/' + name + ')}');
  fs.writeFileSync(path.join(assets, 'main.js.map'),
    JSON.stringify({ names: [name, ignored] }));

  const result = await convertAndroidGeneratedPng({
    dist, minBytes: 0, minSavingBytes: 1000, minSavingFraction: 0.05, minPsnrDb: 34,
  });
  assert.equal(result.converted, 1, 'expected one referenced, fingerprinted conversion');
  assert(result.savedBytes > 0, 'WebP must save actual bytes');
  assert(!fs.existsSync(path.join(assets, name)), 'old PNG must be removed');
  assert(fs.existsSync(path.join(assets, newName)), 'converted file must exist');
  assert(fs.existsSync(path.join(assets, ignored)), 'orphan must not be modified');
  assert(fs.existsSync(path.join(assets, plain)), 'unfingerprinted PNG must stay untouched');

  for (const file of ['index.html', 'assets/main.js', 'assets/main.css', 'assets/main.js.map']) {
    const body = fs.readFileSync(path.join(dist, file), 'utf8');
    assert(body.includes(newName), file + ' should reference the new WebP');
    assert(!body.includes(name), file + ' must not reference the removed PNG');
  }
  const meta = await sharp(path.join(assets, newName)).metadata();
  assert.equal(meta.format, 'webp');
  assert.equal(meta.width, width);
  assert.equal(meta.height, height);
  console.log('OK Android WebP: references, file format, dimensions, orphan protection');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
