import fs from 'node:fs';

function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const play = read('src/pages/Wave61SharedPlay.tsx');
const end = read('src/pages/wave61/Wave61EndSummary.tsx');
const summary = read('src/pages/DartsModeSummaryPage.tsx');
const catalog = read('src/games/dartsWave61.ts');

const ids = [...catalog.matchAll(/\{ id: "([^"]+)"/g)].map((m) => m[1]);
const EXPECTED = 65;
assert(ids.length === EXPECTED, `${EXPECTED} modes attendus, trouvé ${ids.length}`);
assert(new Set(ids).size === EXPECTED, 'IDs Wave61 dupliqués');

for (const token of ['Wave61EndSummary', 'buildWave61EndRows', 'buildWave61MatchStats', 'onStats={() => go?.("darts_mode_summary"', 'onHistory={() => go?.("statsHub"']) {
  assert(play.includes(token), `Play Wave61: ${token} absent`);
}
for (const token of ['PODIUM', 'PRÉCISION', 'BEST VOLÉE', 'Détails', 'accuracy', 'bestCombo']) {
  assert(end.toLowerCase().includes(token.toLowerCase()), `End summary: ${token} absent`);
}
for (const token of ['readWave61ModeId', 'DARTS_WAVE_61', 'getWave61Preset', 'Wave61SummaryTables', 'rec?.payload?.stateSnapshot?.statsByPlayer', 'mode === "wave61"']) {
  assert(summary.includes(token), `Résumé Darts Wave61: ${token} absent`);
}
for (const token of ['rankings', 'playerStats', 'matchStats', 'finalScores', 'finalProgress']) {
  assert(play.includes(token), `Historique Wave61 enrichi: ${token} absent`);
}

console.log('✅ Wave61 V19 — fin de partie + statistiques transverses');
console.log('✅ Podium / KPIs / tableau joueurs / équipes');
console.log(`✅ Boutons STATS + HISTORIQUE depuis les ${EXPECTED} modes`);
console.log(`✅ DartsModeSummary reconnaît les ${EXPECTED} modeId Wave61`);
console.log('✅ Historique enrichi rankings / playerStats / matchStats');
