import fs from 'node:fs';

const visuals = fs.readFileSync('src/lib/gameEngines/cargoVisuals.ts','utf8');
const hud = fs.readFileSync('src/components/cargo/CargoLoadStatus.tsx','utf8');
const play = fs.readFileSync('src/pages/CargoPlay.tsx','utf8');
const css = fs.readFileSync('src/styles/cargo-ui.css','utf8');

const checks = [
  ['aim cue', visuals.includes('buildCargoAimCue') && visuals.includes('CargoAimCue')],
  ['dart preview matcher', visuals.includes('cargoPreviewDartMatches') && visuals.includes('cargoPreviewDartLabel')],
  ['live target', hud.includes('CIBLE LIVE') && hud.includes('OBJECTIF CONSEILLÉ')],
  ['physical load', hud.includes('CHARGEMENT PHYSIQUE') && hud.includes('cargo-load-unit')],
  ['live darts', hud.includes('VOLÉE LIVE') && hud.includes('HORS CIBLE')],
  ['real cargo art', hud.includes('getCargoContractArt') && hud.includes('getCargoSupportArt')],
  ['current throw wired', play.includes('currentThrow={throwDarts}')],
  ['preview animation', css.includes('cargo-preview-load') && css.includes('cargo-dart-good') && css.includes('cargo-dart-bad')],
  ['short screen preserves live UX', css.includes('.cargo-gameplay-board>.cargo-live-load{display:none!important}')],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('❌ CARGO GAMEPLAY VISUEL V14 FAILED:', failed.map(([name]) => name).join(', '));
  process.exit(1);
}
console.log('✅ CARGO GAMEPLAY VISUEL V14 OK — cible live + chargement physique + volée live + assets réels');
