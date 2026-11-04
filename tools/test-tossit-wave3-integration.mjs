/** V136 TOSSIT integration gate, no app dependencies required. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TOSSIT_MODES, TOSSIT_PLANNED } from '../src/pages/tossit/tossitEngine.ts';
const read = (path) => fs.readFileSync(path, 'utf8');
const screens = read('src/pages/tossit/TossitScreens.tsx');
const publicPage = read('src/pages/PublicLandingPage.tsx');
const app = read('src/App.tsx');
assert.equal(TOSSIT_MODES.length, 9, '9 playable modes after wave 3');
assert.equal(TOSSIT_PLANNED.length, 3, '3 backlog modes remain in the public catalog');
for (const mode of ['battle', 'sniper', 'conquest']) {
  assert(TOSSIT_MODES.some(m => m.id === mode), `${mode} playable`);
  assert(screens.includes(`mode === "${mode}"`), `${mode} has a scoring screen`);
  assert(screens.includes(`ticker_tossit_${mode}.webp`), `${mode} uses own ticker`);
  const path = `src/assets/tickers/ticker_tossit_${mode}.webp`;
  const bytes = fs.readFileSync(path);
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', `${mode} RIFF WebP`);
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', `${mode} WEBP payload`);
  assert(bytes.length < 100 * 1024, `${mode} compressed image under 100 KiB`);
  assert(publicPage.includes('`tossit_${mode.id}`'), 'new mode tickers are dynamically listed on the public page');
}
assert(app.includes('case "tossit_config"') && app.includes('case "tossit_play"'), 'V136 existing routes preserved');
assert(publicPage.includes('TOSSIT_MODES.map') && publicPage.includes('TOSSIT_PLANNED.map'), 'public catalogue is built from same single source');
console.log('TOSSIT wave 3 integration: nine modes, new screens, WEBP assets, public catalogue, routes OK');
