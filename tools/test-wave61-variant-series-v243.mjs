import fs from 'node:fs';
const read = p => fs.readFileSync(new URL('../'+p, import.meta.url), 'utf8');
const play = read('src/pages/Wave61SharedPlay.tsx');
const three = read('src/pages/wave61/modes/three_colorsConfig.tsx');
const suite = read('src/pages/wave61/modes/la_suiteConfig.tsx');
const call = read('src/pages/wave61/modes/color_callConfig.tsx');
const checks = [
  [three.includes('key: "seriesFormat"'), 'LES 3 COULEURS seriesFormat'],
  [suite.includes('key: "seriesFormat"'), 'LA SUITE seriesFormat'],
  [call.includes('key: "seriesFormat"'), 'COLOR CALL seriesFormat'],
  [play.includes('function variantSeriesWinsKey'), 'wins key helper'],
  [play.includes('function VariantSeriesScoreboard'), 'variant scoreboard'],
  [play.includes('isFinishedColorVariant(spec.id) && next.phase === "finished"'), 'series commit all 4 variants'],
  [play.includes('carryVariantSeriesSpecial(fresh, next, spec.id)'), 'series cumulative special stats'],
  [play.includes('threeColorsMatchWins'), 'three colors match wins'],
  [play.includes('laSuiteMatchWins'), 'la suite match wins'],
  [play.includes('colorCallMatchWins'), 'color call match wins'],
];
const bad = checks.filter(([ok])=>!ok);
if (bad.length) {
  for (const [,label] of bad) console.error('❌', label);
  process.exit(1);
}
console.log('✅ V243 — BO/FT + scoreboard + stats/historique cumulés pour LES 3 COULEURS, LA SUITE et COLOR CALL.');
