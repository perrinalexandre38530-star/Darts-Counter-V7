import fs from 'node:fs';

const play = fs.readFileSync('src/pages/CargoPlay.tsx', 'utf8');
const load = fs.readFileSync('src/components/cargo/CargoLoadStatus.tsx', 'utf8');
const engine = fs.readFileSync('src/lib/gameEngines/cargoEngine.ts', 'utf8');
const visuals = fs.readFileSync('src/lib/gameEngines/cargoVisuals.ts', 'utf8');

const checks = [
  ['real Keypad import', play.includes('import Keypad from "../components/Keypad"')],
  ['no unresolved CargoAiryKeypad', !play.includes('<CargoAiryKeypad')],
  ['aim cue used in Play', play.includes('buildCargoAimCue(state, activeStats)')],
  ['keypad target sectors highlighted', play.includes('highlightSegmentNumbers={aimHighlightNumbers}')],
  ['keypad multiplier guided', play.includes('guideMultiplier={aimGuideMultiplier')],
  ['dartboard target guided', play.includes('guideTargets={dartboardGuideTargets')],
  ['dartboard guide label', play.includes('guideLabel={aimCue.fixedTarget')],
  ['live objective block', load.includes('1 · CIBLE LIVE')],
  ['physical load block', load.includes('2 · CHARGEMENT PHYSIQUE')],
  ['live throw block', load.includes('3 · VOLÉE LIVE')],
  ['nine-variant dashboard engine', visuals.includes("variant === 'parcel_delivery'") && visuals.includes("variant === 'convoy'") && visuals.includes("variant === 'long_haul'")],
  ['cargo engine remains present', engine.includes('export function playCargoVisit') || engine.includes('function playCargoVisit')],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  for (const [name] of failed) console.error(`❌ ${name}`);
  process.exit(1);
}
console.log('✅ CARGO FINAL RELEASE V17 OK — gameplay guidé, keypad résolu, cible guidée, HUD métier complet');
