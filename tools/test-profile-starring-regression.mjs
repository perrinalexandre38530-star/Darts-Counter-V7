import assert from 'node:assert/strict';
import { computeProfileStarRating } from '../src/lib/profileStarRating.ts';

const cases = [
  [0, 0, false, 0],
  [5, 0, true, 1],
  [9.99, 0, true, 1],
  [10, 1, false, 1],
  [14.99, 1, false, 1],
  [15, 1, true, 2],
  [38.8, 3, true, 4],
  [95, 9, true, 10],
  [99.99, 9, true, 10],
  [100, 10, false, 10],
  [119.99, 10, false, 10],
  [120, 10, false, 11],
  [140, 10, false, 12],
  [160, 10, false, 13],
  [180, 10, false, 14],
];

for (const [avg3d, full, half, glyphs] of cases) {
  const r = computeProfileStarRating(avg3d);
  assert.equal(r.baseFullStars, full, `full stars @ ${avg3d}`);
  assert.equal(r.hasHalfStar, half, `half star @ ${avg3d}`);
  assert.equal(r.totalGlyphs, glyphs, `glyph count @ ${avg3d}`);
}

console.log('ProfileStarring regression OK: 38.8 AVG3D = 3 full stars + 1 half star.');
