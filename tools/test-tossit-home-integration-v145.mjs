// Targeted integration contract: V145 quick switch, Settings and sport-specific HOME.
// Run from project root: node tools/test-tossit-home-integration-v145.mjs
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const read = (name) => fs.readFileSync(path.resolve(process.cwd(), name), 'utf8');
const app = read('src/App.tsx');
const home = read('src/pages/tossit/TossitHome.tsx');
const picker = read('src/components/SportQuickSwitch.tsx');
const settings = read('src/pages/Settings.tsx');
const watermark = read('src/components/home/SportWelcomeWatermark.tsx');
const sportRouter = read('src/pages/SportRouter.tsx');
const engine = read('src/pages/tossit/tossitEngine.ts');

assert.match(picker, /id: "tossit", label: "TOSSIT SCORING"/);
assert.match(picker, /if \(s === "tossit"\) return "tossit"/);
assert.match(settings, /id: "tossit", label: "TOSSIT SCORING"/);
assert.match(settings, /tossit: true/);
assert.match(watermark, /tossit: logoTossit/);
assert.match(app, /const TossitHome = React\.lazy\(\(\) => import\("\.\/pages\/tossit\/TossitHome"\)\)/);
assert.match(app, /case "home":\s*page\s*=\s*activeSport === "tossit" \? \(\s*<TossitHome store=\{store\} update=\{update\} go=\{go\} \/>/);
assert.match(app, /case "games":\s*page\s*=\s*activeSport === "tossit" \? \(\s*<TossitMenu go=\{go\} \/>/);
assert.match(sportRouter, /sport === "tossit"\) return <TossitHome/);
assert.match(home, /<SportHomeWelcomeHeader sport="tossit"/);
assert.match(home, /<ActiveProfileCard hideStatus suppressDefaultStatsSlides/);
assert.match(home, /<ArcadeTicker items=\{tickerItems\}/);
assert.match(home, /<PageAdBanner placement="home" slotKey="page-home-tossit-under-header"/);
assert.match(home, /useHistory\(\)/);
assert.match(home, /isTossitMatch/);
assert.match(home, /go\("games"\)/);
assert.match(home, /go\("stats"\)/);
assert.match(home, /go\("tossit_config", \{ mode: "classic" \}\)/);
for (const mode of ['classic', 'river', 'battle']) assert.match(engine, new RegExp(`id: "${mode}"`));
for (const [, importPath] of home.matchAll(/from "(\.\.[^"]+)"/g)) {
  const resolved = path.resolve('src/pages/tossit', importPath);
  assert.ok(['', '.tsx', '.ts', '.webp', '.png'].some(ext => fs.existsSync(resolved + ext)), `Missing import: ${importPath}`);
}
console.log('PASS: 19 TOSSIT V145 navigation, HOME, Settings and asset checks.');
