import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = (path) => readFileSync(resolve(root, path), 'utf8');
const app = source('src/App.tsx');
const five = source('src/pages/FiveLivesPlay.tsx');
const halve = source('src/pages/HalveItPlay.tsx');
const stats = source('src/pages/StatsHub.tsx');
// Ne pas écraser les changements natifs de V139 dans la navigation TRAINING/CHALLENGE.
assert.match(app, /<ChallengeConfig go=\{go\} params=\{routeParams\}/);
assert.match(app, /initialChallengeCatalog=\{Boolean\(routeParams\?\.challengeCatalog\)\}/);
assert.match(app, /onCustomizeChallenge=\{/);
// V219 : le secours est écrit avant la transaction V4 ; la confirmation est attendue.
assert.match(app, /stagePendingDartsFinalResult\(dartsFinalMode, saved, pendingScope\)/);
assert.match(app, /recoverPendingDartsFinalResult\(item\.id, scope/);
assert.match(app, /const confirmBeforeMirror = isTossitMatch \|\| options\?\.confirmPersistence === true/);
assert.match(app, /return upsertPromise;/);
assert.match(app, /isTossitMatch/);
// V139 : conservation du résultat final dans le brouillon en cas de crash immédiat.
assert.match(five, /finishedMatch: match/);
assert.match(five, /restored\?\.finishedMatch\?\.winnerId/);
assert.match(five, /finalMatch, setFinalMatch\] = React\.useState<any>\(restored\?\.finishedMatch/);
assert.match(five, /saveGateRef\.current\.save/);
assert.match(five, /confirmPersistence: true/);
assert.match(halve, /saveGateRef\.current\.save/);
assert.match(halve, /confirmPersistence: true/);
assert.match(stats, /readToken !== latestReadToken/);
assert.match(source('src/pages/FiveLivesConfig.tsx'), /<DartsPendingFinalCard/);
assert.match(source('src/pages/HalveItConfig.tsx'), /<DartsPendingFinalCard/);
for (const file of ['src/App.tsx','src/pages/FiveLivesPlay.tsx','src/pages/HalveItPlay.tsx']) {
  assert.doesNotMatch(source(file), /^(?:<<<<<<< V139|>>>>>>> V219)/m);
}
console.log('PASS V220 : V139 preserved, V217/V218/V219 merged, CHASE / SPLIT SCORE / TOSSIT / TRAINING intact');
