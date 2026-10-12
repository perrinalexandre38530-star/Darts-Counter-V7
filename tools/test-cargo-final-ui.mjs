import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (p) => fs.readFileSync(p, 'utf8');
const exists = (p) => fs.existsSync(p);

const required = [
  'src/styles/cargo-ui.css',
  'src/pages/CargoConfig.tsx',
  'src/pages/CargoPlay.tsx',
  'src/pages/CargoEnd.tsx',
  'src/components/cargo/CargoLoadStatus.tsx',
  'src/components/history/CargoHistoryDetail.tsx',
  'src/components/stats/CargoStatsTabFull.tsx',
];
required.forEach((p) => assert.ok(exists(p), `fichier manquant: ${p}`));

const css = read('src/styles/cargo-ui.css');
assert.match(css, /grid-template-areas:"hero input" "quick input" "load input"/);
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /cargo-history-detail-shell/);
assert.match(css, /cargo-stats-tabs/);

const config = read('src/pages/CargoConfig.tsx');
assert.match(config, /cargo-config-page/);
assert.match(config, /cargo-config-complete/);

const play = read('src/pages/CargoPlay.tsx');
assert.match(play, /cargo-play-page/);
assert.match(play, /cargo-play-hero/);
assert.match(play, /cargo-play-quickbar/);
assert.match(play, /cargo-play-input/);
assert.match(play, /event\.key === "Escape"/);

const end = read('src/pages/CargoEnd.tsx');
assert.match(end, /cargo-ui\.css/);
assert.match(end, /event\.key === "Escape"/);

const history = read('src/components/history/CargoHistoryDetail.tsx');
assert.match(history, /cargo-history-detail-shell/);
assert.match(history, /event\.key === "Escape"/);

const stats = read('src/components/stats/CargoStatsTabFull.tsx');
assert.match(stats, /cargo-stats-root/);
assert.match(stats, /cargo-stats-tabs/);

console.log('✅ CARGO FINAL UI CONTRACT OK');
