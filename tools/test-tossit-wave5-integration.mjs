import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {TOSSIT_MODES} from '../src/pages/tossit/tossitEngine.ts';
const screen=readFileSync('src/pages/tossit/TossitScreens.tsx','utf8');
const pub=readFileSync('src/pages/PublicLandingPage.tsx','utf8');
const app=readFileSync('src/App.tsx','utf8');
assert(TOSSIT_MODES.length>=16);
for(const id of ['thief_cop','reach','rainbow']) {
 assert(screen.includes(`mode === "${id}"`),`${id} UI registered`);
 for(const suffix of ['','_fr','_en']) assert(existsSync(`src/assets/tickers/ticker_tossit_${id}${suffix}.webp`),`${id}${suffix} image`);
}
assert(pub.includes('TOSSIT_MODES.map'), 'Public modes catalogue uses registry');
assert(pub.includes('publicTossitTickerFor(mode.id, lang)'),'Public TOSSIT art localized');
assert(app.includes('TossitHome') && app.includes('<TossitHome'), 'Home TOSSIT route preserved');
assert(screen.includes('onFinish?.(match)') && screen.includes('History.list()'),'History V4 flow preserved');
console.log('TOSSIT Wave5 integration OK');
