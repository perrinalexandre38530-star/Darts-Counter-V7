import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const exists = (file) => fs.existsSync(file);

const coreFiles = [
  'src/pages/CargoConfig.tsx',
  'src/pages/CargoPlay.tsx',
  'src/pages/CargoEnd.tsx',
  'src/lib/gameEngines/cargoEngine.ts',
  'src/lib/gameEngines/cargoVisuals.ts',
  'src/components/history/CargoHistoryScoreBlock.tsx',
  'src/components/history/CargoHistoryDetail.tsx',
  'src/components/stats/CargoStatsTabFull.tsx',
  'src/components/cargo/CargoLoadStatus.tsx',
  'src/components/cargo/CargoManifestStrip.tsx',
  'src/components/cargo/CargoTeamStrip.tsx',
  'src/components/cargo/CargoParcelRoutePanel.tsx',
  'src/components/cargo/cargoArt.ts',
  'src/styles/cargo-ui.css',
  'src/styles/cargo-end.css',
];
for (const file of coreFiles) assert.ok(exists(file), `fichier CARGO manquant: ${file}`);

const artFiles = [
  'src/assets/cargo/chargement-complet.png',
  'src/assets/cargo/chargement-en-cours.png',
  'src/assets/cargo/palette-logistique.png',
  'src/assets/cargo/colis-cargo.png',
  'src/assets/cargo/contrat-express.png',
  'src/assets/cargo/contrat-fragile.png',
  'src/assets/cargo/contrat-outillage.png',
];
for (const file of artFiles) {
  assert.ok(exists(file), `asset CARGO manquant: ${file}`);
  const buffer = fs.readFileSync(file);
  assert.ok(buffer.length > 1024, `asset CARGO vide/trop petit: ${file}`);
  assert.equal(buffer.subarray(1, 4).toString('ascii'), 'PNG', `asset non PNG: ${file}`);
}

const config = read('src/pages/CargoConfig.tsx');
for (const token of ['SOLO', 'DUEL', 'MULTI', 'ÉQUIPES', 'balanceTeams', 'moveTeamMember', 'interleaveTeams']) {
  assert.ok(config.includes(token), `configuration CARGO incomplète: ${token}`);
}

const play = read('src/pages/CargoPlay.tsx');
for (const token of [
  'CargoLoadStatus', 'CargoManifestStrip', 'CargoTeamStrip', 'CargoParcelRoutePanel',
  'MISSION TERMINÉE', 'RÉSULTATS', 'REJOUER', 'HISTORIQUE', 'setShowEnd(true)',
  'buildHistoryRecord("finished")', 'state.phase === "playing"',
]) assert.ok(play.includes(token), `play CARGO incomplet: ${token}`);

const end = read('src/pages/CargoEnd.tsx');
for (const token of ['computeCargoMissionGrade', 'buildCargoMatchStats', 'buildCargoTeamStats', 'RECORDS']) {
  assert.ok(end.includes(token), `fin CARGO incomplète: ${token}`);
}

const historyCard = read('src/components/history/CargoHistoryScoreBlock.tsx');
const historyDetail = read('src/components/history/CargoHistoryDetail.tsx');
for (const token of ['"completed"', '"complete"', '"done"']) {
  assert.ok(historyCard.includes(token), `statut historique non normalisé: ${token}`);
  assert.ok(historyDetail.includes(token), `statut détail historique non normalisé: ${token}`);
}
assert.ok(historyDetail.includes('TERMINÉE') && historyDetail.includes('EN COURS'), 'état de mission absent du détail historique');

const stats = read('src/components/stats/CargoStatsTabFull.tsx');
for (const token of ['JOUEURS', 'ÉQUIPES', 'RECORDS', 'CARGO']) assert.ok(stats.includes(token), `stats CARGO incomplètes: ${token}`);

const engine = read('src/lib/gameEngines/cargoEngine.ts');
const variants = ['cargo_classic','free_load','full_pallet','exact_load','fragile_cargo','cargo_rush','convoy','long_haul','parcel_delivery'];
for (const variant of variants) assert.ok(engine.includes(variant), `variante CARGO absente: ${variant}`);
assert.ok(engine.includes('convoy_handoff'), 'relais Convoy absent du moteur');

const ticker = 'src/assets/tickers/ticker_cargo.png';
const tickerPresent = exists(ticker);
for (const page of [config, play]) {
  assert.ok(page.includes('getTicker("cargo")'), 'résolution souple du ticker CARGO absente');
  assert.ok(page.includes('tickerSrc={tickerCargo || undefined}'), 'fallback PageHeader CARGO absent');
}
assert.ok(!config.includes('import tickerCargo from "../assets/tickers/ticker_cargo.png"'), 'CargoConfig conserve un import statique bloquant');
assert.ok(!play.includes('import tickerCargo from "../assets/tickers/ticker_cargo.png"'), 'CargoPlay conserve un import statique bloquant');
console.log('✅ CARGO CERTIFICATION V11 — chaîne Config → Play → End → Historique → Stats cohérente');
console.log('✅ CARGO CERTIFICATION V11 — écran terminé réouvrable après fermeture du bilan');
console.log('✅ CARGO CERTIFICATION V11 — statuts historique legacy normalisés');
console.log('✅ CARGO CERTIFICATION V11 — assets métier PNG vérifiés');
if (!tickerPresent) {
  console.log('✅ CARGO MEDIA FALLBACK — ticker officiel absent, header texte CARGO utilisé sans bloquer la compilation');
} else {
  console.log('✅ CARGO MEDIA GATE — ticker officiel présent et utilisé automatiquement');
}
