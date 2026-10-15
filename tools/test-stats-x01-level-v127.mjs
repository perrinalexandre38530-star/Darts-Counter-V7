import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
const check = (name, ok, detail='') => {
  checks.push({ name, ok: !!ok, detail });
  if (!ok) console.error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  else console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
};

const home = read('src/pages/Home.tsx');
const x01 = read('src/stats/X01MultiStatsTabFull.tsx');
const agg = read('src/lib/x01MultiAgg.ts');
const statsHub = read('src/pages/StatsHub.tsx');
const profiles = read('src/pages/Profiles.tsx');
const starring = read('src/lib/x01ProfileStarring.ts');
const diagnostic = read('src/lib/statsSystemDiagnostics.ts');

check('old current-form Home selector removed', !home.includes('selectCurrentFormMatches'));
check('Home lifetime level uses shared semantic helper', home.includes('computeX01LevelSnapshot(x01AggLifetime, 10)'));
check('Home exposes current X01 avg', home.includes('x01CurrentAvg3D'));
check('X01 page has no current TimeRange', !/type TimeRange[^\n]*current/.test(x01));
check('X01 page has no current filter branch', !x01.includes('range === "current"'));
check('X01 page shows global level', x01.includes('levelLabels.global'));
check('X01 page shows current level', x01.includes('levelLabels.current'));
check('current level is capped to latest 10', agg.includes('progression.slice(-safeLimit)') && agg.includes('currentLimit: safeLimit'));
check('StatsHub carries current avg separately', statsHub.includes('avg3Current') && statsHub.includes('x01CurrentAvg3D'));
check('StatsHub star prefers current level', statsHub.includes('dashAvg3Current') && statsHub.indexOf('dashAvg3Current') < statsHub.indexOf('canonicalStarAvg3D', statsHub.indexOf('dashAvg3Current')));
check('Profiles star prefers current avg', profiles.includes('activeStats?.currentAvg3'));
check('shared avatar starring uses explicit current keys', starring.includes('currentAvg3D') && starring.includes('last10Avg3D'));
check('diagnostic validates global/current X01 semantics', diagnostic.includes('x01-level-semantics'));

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
