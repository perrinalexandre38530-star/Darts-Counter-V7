import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const catalog = read('src/games/dartsWave61.ts');
const shared = read('src/pages/Wave61SharedPlay.tsx');
const end = read('src/pages/wave61/Wave61EndSummary.tsx');

const ids = [...catalog.matchAll(/\bid:\s*"([^"]+)"/g)].map((m) => m[1]);
const unique = [...new Set(ids)];
if (unique.length !== 65) throw new Error(`V97: catalogue Wave61 attendu=65, obtenu=${unique.length}`);

const missing = [];
for (const id of unique) {
  for (const suffix of ['Config.tsx', 'Play.tsx']) {
    const p = path.join(root, 'src/pages/wave61/modes', `${id}${suffix}`);
    if (!fs.existsSync(p)) missing.push(path.relative(root, p));
  }
}
if (missing.length) throw new Error(`V97: écrans dédiés manquants: ${missing.join(', ')}`);

for (const needle of ['corbeau_renard', 'darts_impossible', 'mistigri', 'radin']) {
  if (!shared.includes(`spec.id === "${needle}"`) && !shared.includes(`spec.id === '${needle}'`)) {
    throw new Error(`V97: panneau final non câblé: ${needle}`);
  }
}
for (const needle of ['RÉCOMPENSES DU MATCH', 'wave61PrimaryMetric', 'row.doubles', 'row.triples', 'row.bulls']) {
  if (!end.includes(needle)) throw new Error(`V97: fin de partie V96 incomplète: ${needle}`);
}

const panelFiles = [
  'Wave61MissionAdventurePanels.tsx','Wave61AscentPanels.tsx','Wave61ConquestPanels.tsx',
  'Wave61SurvivalCombatPanels.tsx','Wave61PartyArcadePanels.tsx','Wave61FablePartyPanels.tsx','Wave61RacePanels.tsx'
];
let exported = 0;
for (const f of panelFiles) {
  const s = read(`src/pages/wave61/${f}`);
  exported += [...s.matchAll(/export\s+function\s+([A-Za-z0-9_]+Panel)\b/g)].length;
}
if (exported < 1) throw new Error('V97: aucun panneau Wave61 dédié détecté');

console.log(`✅ Wave61 V97 FINAL — ${unique.length}/65 modes · 65 Config · 65 Play · V94/V95 câblés · fin de partie V96 verrouillée`);
