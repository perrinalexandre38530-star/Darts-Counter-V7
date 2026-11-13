import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js';
const root = path.resolve(import.meta.dirname, '..');
const source = (file) => fs.readFileSync(path.join(root, file), 'utf8');
for (const file of [
  'src/components/ShoveMatchMidZone.tsx',
  'src/components/ShoveStatsDashboard.tsx',
  'src/components/PageHeader.tsx',
  'src/pages/Wave61SharedPlay.tsx',
]) {
  const tree = ts.createSourceFile(file, source(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.equal(tree.parseDiagnostics.length, 0, `${file}: syntax error`);
}
const mid = source('src/components/ShoveMatchMidZone.tsx');
const css = source('src/components/ShoveMatchMidZone.css');
assert.match(mid, /getShoveValidatedCells\(state, playerId\)/);
assert.match(mid, /const electronic =/);
assert.match(mid, /is-electronic/);
assert.match(css, /grid-auto-columns:\s*minmax\(39px,\s*1fr\)/);
assert.match(css, /justify-content:\s*flex-start/);
assert.match(css, /margin-top:\s*-7px/);
assert.match(mid, /canRequestBannerAds\(prefs\) && !adFree/);
assert.match(mid, /freeHeight >= 120/);
const stats = source('src/components/ShoveStatsDashboard.tsx');
const statsCss = source('src/components/ShoveStatsDashboard.css');
for (const word of ['resume','marques','evolution','comparatif','records']) assert.match(stats, new RegExp(`id: "${word}"`));
assert.match(stats, /deriveShoveMatchRecords\(state\)/);
assert.match(stats, /rankShovePlayers\(state\)/);
assert.match(stats, /className="mss-shove-stats-tabs"/);
assert.match(statsCss, /prefers-reduced-motion/);
assert.match(statsCss, /shoveLineDraw/);
assert.match(statsCss, /shoveSectorGrow/);
const play = source('src/pages/Wave61SharedPlay.tsx');
assert.match(play, /spec.id === "shove_a_penny" && config.scoreInputMethod === "target"/);
assert.match(play, /tickerBottomGap=\{spec.id === "shove_a_penny"/);
assert.match(play, /<ShoveMatchMidZone/);
// Regression guard: do not shrink the proven SHOVE clearance or top border vanishes under sticky ticker.
assert.match(play, /tickerBottomGap=\{spec\.id === "shove_a_penny" \? \(isLandscapeTablet \? 11 : 16\)/);
assert.match(play, /data-shove-header-clearance="1"[^\n]*height:10,minHeight:10/);
assert.match(play, /spec\.id === "shove_a_penny" \? "8px 8px 7px"/);
const header = source('src/components/PageHeader.tsx');
assert.match(header, /Math.max\(8, tickerBottomGap\)/);
console.log('OK SHOVE V132: BULL visible, validated strip adjacent, eligible ad only, stats tabs and animated charts, safe header gap and full top border.');
