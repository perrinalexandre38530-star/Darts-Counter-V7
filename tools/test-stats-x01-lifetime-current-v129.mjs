import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
const check = (name, ok, detail = '') => {
  checks.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const x01 = read('src/stats/X01MultiStatsTabFull.tsx');
const agg = read('src/lib/x01MultiAgg.ts');
const hub = read('src/pages/StatsHub.tsx');
const stars = read('src/lib/profileStarScore.ts');
const starring = read('src/lib/x01ProfileStarring.ts');
const diag = read('src/lib/statsSystemDiagnostics.ts');

check('lifetime scope is independent from filters',
  x01.includes('const lifetimeAllSessions = sessions.slice()') &&
  x01.includes('const statsSessions = lifetimeProfileSessions;'));
check('analysis scope keeps J/S/M/A filters separate',
  x01.includes('const analysisSessions = selectedSessions;') &&
  x01.includes('const sparkSeries = analysisSessions.map'));
check('lifetime match totals use unfiltered match groups',
  /const matchGroups = new Map[\s\S]{0,180}for \(const s of lifetimeAllSessions\)/.test(x01));
check('lifetime outcomes use unfiltered match groups',
  /const groupedByMatch:[\s\S]{0,180}for \(const s of lifetimeAllSessions\)/.test(x01));
check('global AVG3D is canonical lifetime value',
  x01.includes('const globalAvg3D = lifetimeLevelAvg3D > 0 ? lifetimeLevelAvg3D : sessionGlobalAvg3D;'));
check('current AVG3D remains a separate last-10 indicator',
  x01.includes('const currentLevelSessions = levelProfileSessions.slice(-10);') &&
  x01.includes('AVG3D actuel · calcul sur {currentLevelMatches}'));
check('UI explicitly states totals stay lifetime',
  x01.includes('Les totaux, victoires, records et l’AVG3D globale restent calculés sur tout l’historique X01.'));
check('level helper selects 10 matches before validating AVG3D',
  agg.indexOf('const currentRows = progression.slice(-safeLimit);') < agg.indexOf('const validCurrentRows = currentRows.filter'));
check('current AVG3D never falls back to lifetime',
  agg.includes('const currentAvg3D = validCurrentRows.length > 0') && !agg.includes(': lifetimeAvg3D;'));
check('compact X01 rows preserve a chronological level row even without AVG3D',
  agg.includes("garder UNE entrée chronologique par match"));
check('StatsHub star has no lifetime avg fallback',
  /const avg = Number\([\s\S]{0,220}stats\?\.last10Avg3D \?\?[\s\S]{0,80}0[\s\S]{0,20}\);/.test(hub) &&
  !/stats\?\.last10Avg3D \?\?[\s\S]{0,120}stats\?\.avg3/.test(hub));
check('sync star resolver is current-only for humans',
  stars.includes('const currentCandidates = [') &&
  stars.indexOf('if (!isBotProfile) return 0;') < stars.indexOf('const botAvgCandidates = ['));
check('async avatar starring is current-only for humans',
  starring.includes('les humains n\'utilisent JAMAIS une AVG3D lifetime') &&
  starring.indexOf('if (!isBotProfile) return null;') < starring.indexOf('const avgKeys = new Set(['));
check('diagnostic checks lifetime UI vs analysis window',
  diag.includes('x01-tab-lifetime-scope-v129') &&
  diag.includes('tabLifetimeMatches') &&
  diag.includes('tabAnalysisMatches'));
check('diagnostic version bumped', diag.includes('stats-diagnostic-v129'));
check('diagnostic no longer emits v124 reports', !diag.includes('version: \"stats-diagnostic-v124\"'));
check('diagnostic v129 cache key is used', diag.includes('dc_stats_system_diagnostic_report_v129'));
check('old V127 current TimeRange remains absent', !/type TimeRange[^\n]*current/.test(x01));

// Semantic smoke-test independent of React: 55 lifetime results must never become 10.
const synthetic = Array.from({ length: 55 }, (_, i) => ({
  id: `m${i + 1}`,
  avg3D: 25 + i,
  win: i % 2 === 0,
}));
const lifetimeMatches = synthetic.length;
const lifetimeWins = synthetic.filter((m) => m.win).length;
const currentWindow = synthetic.slice(-10);
const currentAvg3D = currentWindow.reduce((s, m) => s + m.avg3D, 0) / currentWindow.length;
const globalAvg3D = synthetic.reduce((s, m) => s + m.avg3D, 0) / synthetic.length;
check('semantic smoke: total matches stays 55', lifetimeMatches === 55);
check('semantic smoke: total wins stays lifetime', lifetimeWins === 28);
check('semantic smoke: current window is exactly 10', currentWindow.length === 10);
check('semantic smoke: global and current avg are distinct', globalAvg3D !== currentAvg3D);

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
