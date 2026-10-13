import fs from 'node:fs';

const visuals = fs.readFileSync('src/lib/gameEngines/cargoVisuals.ts','utf8');
const hud = fs.readFileSync('src/components/cargo/CargoLoadStatus.tsx','utf8');
const play = fs.readFileSync('src/pages/CargoPlay.tsx','utf8');
const css = fs.readFileSync('src/styles/cargo-ui.css','utf8');

const checks = [
  ['mission cue helper', visuals.includes('buildCargoMissionCue')],
  ['last visit feedback helper', visuals.includes('buildCargoLastVisitFeedback')],
  ['risk cue helper', visuals.includes('buildCargoRiskCue')],
  ['objective block', hud.includes('1 · OBJECTIF ACTUEL')],
  ['visit result block', hud.includes('2 · DERNIÈRE VOLÉE')],
  ['loading/risk block', hud.includes('3 · CHARGEMENT') && hud.includes('risk.detail')],
  ['short screen keeps gameplay hud', css.includes('.cargo-gameplay-hud{display:grid!important')],
  ['play keeps clarity row on short screen', play.includes('112px 48px 88px minmax(0,1fr)')],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('❌ CARGO GAMEPLAY CLARITY V13 FAILED:', failed.map(([name]) => name).join(', '));
  process.exit(1);
}
console.log('✅ CARGO GAMEPLAY CLARITY V13 OK — objectif + résultat de volée + risque + progression visibles en jeu');
