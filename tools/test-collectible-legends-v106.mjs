import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const EXPECTED = 82;
const source = fs.readFileSync(path.join(root, 'src/lib/collectibleCards.ts'), 'utf8');
const panel = fs.readFileSync(path.join(root, 'src/components/profile/CollectibleCardsPanel.tsx'), 'utf8');
const ids = [...source.matchAll(/id: "(legend_[^"]+)"/g)].map((m) => m[1]);
assert.equal(ids.length, EXPECTED, `expected ${EXPECTED} legend cards, got ${ids.length}`);
assert.equal(new Set(ids).size, EXPECTED, 'legend card ids must be unique');
const images = [...source.matchAll(/image: "(\/images\/collectible-legends\/[^"]+\.webp)"/g)].map((m) => m[1]);
assert.equal(images.length, EXPECTED, `expected ${EXPECTED} legend images, got ${images.length}`);
assert.equal(new Set(images).size, EXPECTED, 'legend image paths must be unique');
for (const url of images) {
  const disk = path.join(root, 'public', url.replace(/^\//, ''));
  assert.ok(fs.existsSync(disk), `missing legend image ${url}`);
  assert.ok(fs.statSync(disk).size > 25_000, `legend image unexpectedly small ${url}`);
}
assert.ok(source.includes('collection: "legends"'), 'legends collection missing');
assert.ok(panel.includes('filter === "legends"'), 'legends filter missing');
assert.ok(panel.includes('card.image || IMAGE_BY_CARD[card.id]'), 'legend local image fallback missing');
const legendBlock = source.split('// Collection LÉGENDES')[1] || '';
const challengeSignatures = [...legendBlock.matchAll(/requirements: \[([\s\S]*?)\n  \] \},/g)].slice(0,EXPECTED).map((m) =>
  [...m[1].matchAll(/metric: "([^"]+)", target: (\d+)/g)].map((x) => `${x[1]}:${x[2]}`).join('|')
);
assert.equal(challengeSignatures.length, EXPECTED, `expected ${EXPECTED} challenge definitions`);
assert.equal(new Set(challengeSignatures).size, EXPECTED, 'each legend card must have a distinct unlock challenge');
console.log('OK collectible legends v106: 82 cards, 82 images, 82 distinct unlock challenges');

assert.ok(source.includes('name: "JOCKY"'), "Jocky must replace incorrect THE NODOR identity");
assert.ok(!source.includes('name: "THE NODOR"'), "duplicate Jocky identity under THE NODOR");
