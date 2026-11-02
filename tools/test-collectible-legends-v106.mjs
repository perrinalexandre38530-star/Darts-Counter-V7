import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'src/lib/collectibleCards.ts'), 'utf8');
const panel = fs.readFileSync(path.join(root, 'src/components/profile/CollectibleCardsPanel.tsx'), 'utf8');
const ids = [...source.matchAll(/id: "(legend_[^"]+)"/g)].map((m) => m[1]);
assert.equal(ids.length, 51, `expected 51 legend cards, got ${ids.length}`);
assert.equal(new Set(ids).size, 51, 'legend card ids must be unique');
const images = [...source.matchAll(/image: "(\/images\/collectible-legends\/[^"]+\.webp)"/g)].map((m) => m[1]);
assert.equal(images.length, 51, `expected 51 legend images, got ${images.length}`);
assert.equal(new Set(images).size, 51, 'legend image paths must be unique');
for (const url of images) {
  const disk = path.join(root, 'public', url.replace(/^\//, ''));
  assert.ok(fs.existsSync(disk), `missing legend image ${url}`);
  assert.ok(fs.statSync(disk).size > 25_000, `legend image unexpectedly small ${url}`);
}
assert.ok(source.includes('collection: "legends"'), 'legends collection missing');
assert.ok(panel.includes('filter === "legends"'), 'legends filter missing');
assert.ok(panel.includes('card.image || IMAGE_BY_CARD[card.id]'), 'legend local image fallback missing');
const legendBlock = source.split('// Collection LÉGENDES')[1] || '';
const challengeSignatures = [...legendBlock.matchAll(/requirements: \[([\s\S]*?)\n  \] \},/g)].slice(0,51).map((m) =>
  [...m[1].matchAll(/metric: "([^"]+)", target: (\d+)/g)].map((x) => `${x[1]}:${x[2]}`).join('|')
);
assert.equal(challengeSignatures.length, 51, 'expected 51 challenge definitions');
assert.equal(new Set(challengeSignatures).size, 51, 'each legend card must have a distinct unlock challenge');
console.log('OK collectible legends v106: 51 cards, 51 images, 51 distinct unlock challenges');
