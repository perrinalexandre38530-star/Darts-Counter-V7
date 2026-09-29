import fs from 'node:fs';
function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const catalog = read('src/games/dartsWave61.ts');
const games = read('src/pages/Games.tsx');
const configRouter = read('src/pages/Wave61Config.tsx');
const playRouter = read('src/pages/Wave61Play.tsx');
const budget = read('tools/check-wave61-asset-budget.mjs');
const pkg = JSON.parse(read('package.json'));
const ids = [...catalog.matchAll(/\{ id: "([a-z0-9_]+)", label:/g)].map((m) => m[1]);

assert(ids.length === 65, `65 modes attendus, ${ids.length} trouvés`);
for (const id of ids) assert(fs.existsSync(`src/assets/tickers/ticker_${id}.webp`), `ticker manquant: ${id}`);
assert(games.includes('loading="lazy"'), 'lazy-loading des tickers Games absent');
assert(games.includes('decoding="async"'), 'decoding async des tickers Games absent');
assert(configRouter.includes('import.meta.glob("./wave61/modes/*Config.tsx")'), 'lazy Config Wave61 absent');
assert(playRouter.includes('import.meta.glob("./wave61/modes/*Play.tsx")'), 'lazy Play Wave61 absent');
assert(budget.includes("src', 'assets', 'tickers"), 'budget ne scanne pas les tickers réels');
assert(budget.includes('MSS_WAVE61_TICKERS_MAX_MB || 6'), 'budget global 6 MB absent');
assert(budget.includes('MSS_WAVE61_TICKER_MAX_KB || 160'), 'budget unitaire 160 KB absent');
const sync = String(pkg.scripts?.['android:sync'] || '');
for (const token of ['test:wave61', 'build', 'android:optimize-local-media', 'android:media-budget', 'npx cap sync android', 'android:release-check']) {
  assert(sync.includes(token), `android:sync: ${token} absent`);
}
assert(sync.indexOf('test:wave61') < sync.indexOf('build'), 'tests Wave61 doivent précéder le build');
assert(sync.indexOf('android:media-budget') < sync.indexOf('npx cap sync android'), 'budget média doit précéder cap sync');

console.log('✅ Wave61 V24 — Android readiness restauré');
console.log('✅ 65 tickers présents + lazy loading Games + budget réel');
console.log('✅ Pipeline android:sync contrôlé');
