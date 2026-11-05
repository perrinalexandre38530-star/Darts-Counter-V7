import assert from 'node:assert/strict';
import { readFileSync,existsSync } from 'node:fs';
import { TOSSIT_MODES } from '../src/pages/tossit/tossitEngine.ts';
const screen=readFileSync('src/pages/tossit/TossitScreens.tsx','utf8');
const pub=readFileSync('src/pages/PublicLandingPage.tsx','utf8');
const app=readFileSync('src/App.tsx','utf8');
assert.equal(TOSSIT_MODES.length,18);
for (const id of ['chores','bottle']) {
 assert(screen.includes(`mode === "${id}"`),`${id} UI registered`);
 assert(pub.includes('publicTossitTickerFor(mode.id, lang)'), 'Public language artwork active');
 for(const suf of ['','_fr','_en']) {
  const path=`src/assets/tickers/ticker_tossit_${id}${suf}.webp`;
  assert(screen.includes(path.split('/').at(-1)),`${path} imported`);
  assert(existsSync(path),`${path} exists`);
  const b=readFileSync(path);
  assert.equal(b.toString('ascii',0,4),'RIFF'); assert.equal(b.toString('ascii',8,12),'WEBP');
  assert(b.length<100_000,'compressed under 100k');
 }
}
assert(app.includes('<TossitHome') && app.includes('<TossitMenu'),'HOME/GAMES stay separate');
assert(screen.includes('History.list()') && screen.includes('onFinish?.(match)'),'history preserved');
console.log('TOSSIT Wave6 integration OK (18 modes, screens, FR/EN WebP, public, home, history)');
