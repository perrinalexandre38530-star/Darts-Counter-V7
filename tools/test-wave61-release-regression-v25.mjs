import fs from 'node:fs';
function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const catalog = read('src/games/dartsWave61.ts');
const families = read('src/games/dartsWave61Families.ts');
const registry = read('src/games/dartsGameRegistry.ts');
const app = read('src/App.tsx');
const config = read('src/pages/Wave61SharedConfig.tsx');
const play = read('src/pages/Wave61SharedPlay.tsx');
const summary = read('src/pages/DartsModeSummaryPage.tsx');
const ids = [...catalog.matchAll(/\{ id: "([a-z0-9_]+)", label:/g)].map((m) => m[1]);

assert(ids.length === 65 && new Set(ids).size === 65, 'Catalogue Wave61 invalide');
for (const id of ids) {
  assert(families.includes(`${id}: "`), `famille absente: ${id}`);
  const cfg = `src/pages/wave61/modes/${id}Config.tsx`;
  const ply = `src/pages/wave61/modes/${id}Play.tsx`;
  assert(fs.existsSync(cfg), `Config absente: ${id}`);
  assert(fs.existsSync(ply), `Play absent: ${id}`);
  assert(read(cfg).includes(`WAVE61_MODE_ID = "${id}"`), `Config ID incohérent: ${id}`);
  assert(read(ply).includes(`WAVE61_MODE_ID = "${id}"`), `Play ID incohérent: ${id}`);
}

for (const token of ['tab: "wave61_config"', 'ready: true']) assert(registry.includes(token), `registry: ${token} absent`);
for (const token of ['case "wave61_config"', 'case "wave61_play"']) assert(app.includes(token), `App route absente: ${token}`);
for (const token of ['go("wave61_play"', 'modeOptions', 'targetAdviceEnabled', 'awenaCommentaryEnabled', 'wave61SfxEnabled']) assert(config.includes(token), `Config runtime: ${token} absent`);
for (const token of ['History.upsert', 'resume:', 'stateSnapshot', 'rankings', 'playerStats', 'matchStats', 'onStats={() => go?.("darts_mode_summary"', 'onHistory={() => go?.("statsHub"']) assert(play.includes(token), `Play/history: ${token} absent`);
for (const token of ['DARTS_WAVE_61', 'readWave61ModeId', 'Wave61SummaryTables', 'mode === "wave61"']) assert(summary.includes(token), `Stats Wave61: ${token} absent`);
for (const id of ['mistigri','radin','corbeau_renard','darts_impossible']) assert(ids.includes(id), `nouveau mode absent: ${id}`);
assert(config.includes('rawModeId === "galaxyes" ? "galaxies"'), 'compatibilité ancien ID galaxyes absente en Config');
assert(play.includes('rawModeId === "galaxyes" ? "galaxies"') || read('src/pages/Wave61Play.tsx').includes('id === "galaxyes" ? "galaxies"'), 'compatibilité ancien ID galaxyes absente en Play');

console.log('✅ Wave61 V25 — régression release Android');
console.log('✅ 65 routes Config/Play + familles + navigation');
console.log('✅ sauvegarde/reprise + historique + stats branchés');
console.log('✅ nouveaux modes et compatibilité GALAXIES contrôlés');
