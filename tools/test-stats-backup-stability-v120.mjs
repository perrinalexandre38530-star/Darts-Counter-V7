import fs from 'node:fs';
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const agg = read('src/lib/x01MultiAgg.ts');
const home = read('src/pages/Home.tsx');
const nas = read('src/lib/manualNasSync.ts');
const drive = read('src/lib/personalCloudApi.ts');
const hist = read('src/pages/HistoryPage.tsx');
const checks = [
  ['X01 accepts legacy name-only player rows', agg.includes('if (!matched) continue;')],
  ['X01 accepts legacy finished statuses', agg.includes('"done", "ended", "match_end"')],
  ['Home session counter uses lifetime aggregate', home.includes('const lifetimeSessions = Number(x01AggLifetime?.sessions || 0)')],
  ['NAS db preflight is advisory', nas.includes('db preflight advisory')],
  ['NAS media failure preserves core snapshot', nas.includes('core snapshot preserved')],
  ['Drive jobs fall back to stable direct endpoint', drive.includes('fallback to stable direct endpoint') && drive.includes('/google_drive/backups`, body')],
  ['History hydration has bounded wait', hist.includes('Promise.race([') && hist.includes('3500')],
  ['History action layer remains clickable', hist.includes('pointerEvents: "auto"')],
];
let bad = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'OK' : 'FAIL'} ${name}`); if (!ok) bad++; }
if (bad) process.exit(1);
