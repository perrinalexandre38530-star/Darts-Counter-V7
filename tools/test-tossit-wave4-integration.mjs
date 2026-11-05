/** V142 TOSSIT Wave 4 integration gate, no app dependencies. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TOSSIT_MODES, TOSSIT_PLANNED } from '../src/pages/tossit/tossitEngine.ts';
const screen = fs.readFileSync('src/pages/tossit/TossitScreens.tsx','utf8');
const publicPage = fs.readFileSync('src/pages/PublicLandingPage.tsx','utf8');
const app = fs.readFileSync('src/App.tsx','utf8');
assert.equal(TOSSIT_MODES.length,13,'13 playable TOSSIT modes');
assert(TOSSIT_PLANNED.length >= 5,'next TOSSIT modes are still catalogued');
for(const mode of ['river','cornhole','goalkeeper','football_pitch']) {
 assert(TOSSIT_MODES.some(x=>x.id===mode), `${mode} is playable`);
 assert(screen.includes(`mode === "${mode}"`), `${mode} has a score entry form`);
 for(const suffix of ['', '_fr','_en']) {
  const name=`src/assets/tickers/ticker_tossit_${mode}${suffix}.webp`;
  assert(screen.includes(name.split('/').at(-1)),`${name} imported`);
  const b=fs.readFileSync(name);
  assert.equal(b.toString('ascii',0,4),'RIFF',`${name} is RIFF`);
  assert.equal(b.toString('ascii',8,12),'WEBP',`${name} is WebP`);
  assert(b.length < 100_000,`${name} compressed to <100 KB`);
 }
}
for(const mode of ['battle','sniper','conquest']) assert(screen.includes(`ticker_tossit_${mode}.webp`),`${mode} ticker preserved`);
assert(screen.includes('tickerForTossit(mode, lang)'), 'localization chooses correct ticker');
assert(publicPage.includes('publicTossitTickerFor(mode.id, lang)'), 'public cards use specific TOSSIT tickers');
assert(publicPage.includes('TOSSIT_MODES.map') && publicPage.includes('TOSSIT_PLANNED.map'), 'public catalogue is driven by the game registry');
assert(publicPage.includes('football_pitch') && publicPage.includes('cornhole'), 'public objective text distinguishes goals and points');
assert(screen.includes('History.list()') && screen.includes('onFinish?.(match)'), 'history/statistics path preserved');
assert(app.includes('case "tossit_config"') && app.includes('case "tossit_play"'), 'V142 routes preserved');
console.log('TOSSIT V142 Wave 4: 13 modes, screens, FR/EN WebP tickers, public catalogue and routing OK');
