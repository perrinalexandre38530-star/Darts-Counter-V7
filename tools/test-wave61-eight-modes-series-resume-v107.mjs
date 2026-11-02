import fs from 'node:fs';

const play = fs.readFileSync('src/pages/Wave61SharedPlay.tsx','utf8');
const end = fs.readFileSync('src/pages/wave61/Wave61EndSummary.tsx','utf8');

const checks = [
  ['BLACK VS WHITE conserve sa piste entre manches', play.includes('"blackWhiteColorByPlayer","blackWhiteValidHitsByPlayer"')],
  ['BLACK VS WHITE conserve ses KPI entre manches', play.includes('"blackWhitePenaltyPointsByPlayer","blackWhitePerfectVisitsByPlayer"')],
  ['LA SUITE remet la série courante à zéro à la manche suivante', play.includes('out.laSuiteCurrentStreakByPlayer = Object.fromEntries')],
  ['COLOR CALL ne recopie pas la séquence précédente', play.includes('modeId === "color_call" && key === "colorCallSequence"')],
  ['History contient les KPI BLACK VS WHITE', play.includes('blackVsWhite: {') && play.includes('perfectVisits: Number(s.special?.blackWhitePerfectVisitsByPlayer')],
  ['History contient les KPI BIM BAM BOUM', play.includes('bimBamBoum: { combos:')],
  ['History contient les KPI SAUTE-MOUTONS', play.includes('sauteMoutons: { distance:')],
  ['History contient les KPI TROUPEAU EN DANGER', play.includes('troupeau: { sheepLeft:')],
  ['History contient les KPI RACLETTE', play.includes('raclette: { served:')],
  ['History stocke le snapshot de série', play.includes('const series = isFinishedColorVariant(spec.id) ? variantSeriesSnapshot') && play.includes('matchStats, config: s.config, series')],
  ['Payload stocke également la série', play.includes('visits: s.visits, series, stats:')],
  ['Fin de partie utilise les vraies manches gagnées', (play.match(/legWins=\{variantSeriesLegWinsForEnd\(state, spec.id\)\}/g)||[]).length >= 3],
  ['Tableau final affiche le résultat BO/FT', end.includes('data-eight-modes-series-final="1"') && end.includes('RÉSULTAT DE LA SÉRIE')],
  ['Le double botDifficulty a été supprimé', !play.includes('const botDifficulty = wave61BotDifficultyForProfile(activeProfile, config.botLevel);\n        const botDifficulty = wave61BotDifficultyForProfile(activeProfile, config.botLevel);')],
  ['Le double visitId a été supprimé', !play.includes('visitId: last.id,\n        visitId: last.id,')],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? '✅' : '❌'} ${label}`);
  if (!ok) failed++;
}
if (failed) {
  console.error(`\n${failed} contrôle(s) V107 en échec.`);
  process.exit(1);
}
console.log('\n✅ V107 — séries/reprise/History des 8 nouveaux modes validées.');
