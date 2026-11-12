import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CAPITAL_GRID_PRESETS, CAPITAL_PRESET_ORDER, CAPITAL_OFFICIAL_CONTRACTS,
  CAPITAL_CONTRACT_META, CAPITAL_SELECTABLE_CONTRACTS,
  capitalPresetContracts, CAPITAL_COMMITTEE_REPLACEMENTS, applyCapitalVisit,
} from '../src/lib/capitalGame.ts';

// Vérifie l'intégralité des variantes et la compatibilité V142 des trois IDs.
assert.equal(CAPITAL_PRESET_ORDER.length, 13);
assert.equal(new Set(CAPITAL_PRESET_ORDER).size, 13);
assert.deepEqual(Object.keys(CAPITAL_GRID_PRESETS).sort(), [...CAPITAL_PRESET_ORDER].sort());
for (const [id, def] of Object.entries(CAPITAL_GRID_PRESETS)) {
  assert.ok(def.label.trim(), id);
  assert.ok(def.description.trim(), id);
  assert.ok(['club','bar','moderne','comite','niveau'].includes(def.category), id);
  assert.ok(def.contracts.length >= 2 && def.contracts.length <= 30, `${id}: taille`);
  assert.equal(def.contracts[0], 'capital', `${id}: capital au début`);
  assert.equal(new Set(def.contracts).size, def.contracts.length, `${id}: doublon`);
  def.contracts.forEach(contract => assert.ok(CAPITAL_CONTRACT_META[contract], `${id}: ${contract}`));
  assert.deepEqual(capitalPresetContracts(id), def.contracts);
}
assert.deepEqual(CAPITAL_GRID_PRESETS.clubs15.contracts, CAPITAL_OFFICIAL_CONTRACTS);
assert.deepEqual(CAPITAL_GRID_PRESETS.inverse15.contracts,
  ['capital', ...CAPITAL_OFFICIAL_CONTRACTS.slice(1).reverse()]);
assert.equal(CAPITAL_GRID_PRESETS.bar17.contracts.length, 17);
assert.equal(CAPITAL_GRID_PRESETS.bar17.contracts[14], 'diagonal');
assert.equal(CAPITAL_GRID_PRESETS.modern17.contracts[10], 'peluche');
for(const replacement of CAPITAL_COMMITTEE_REPLACEMENTS) {
  const from = capitalPresetContracts('committee_other17', replacement);
  assert.equal(from[10], replacement);
  assert.ok(!from.includes('peluche'));
  assert.equal(from.length, 17);
}
assert.equal(capitalPresetContracts('committee_other17','n20')[10], 'shanghai', 'substitution invalide refusée');
assert.deepEqual(CAPITAL_GRID_PRESETS.alpes17.contracts, CAPITAL_GRID_PRESETS.modern17.contracts);
for (const [preset, id] of [
  ['committee_shanghai17','shanghai'],
  ['committee_42_17','exact_42'],
  ['committee_petit17','petit_score'],
]) {
  const source = CAPITAL_GRID_PRESETS.alpes17.contracts;
  const actual = CAPITAL_GRID_PRESETS[preset].contracts;
  assert.equal(actual[10], id, preset);
  for (let i=0; i<source.length; i++) if (i !== 10) assert.equal(source[i], actual[i], `${preset} #${i}`);
  assert.ok(!actual.includes('peluche'), `${preset}: peluche restante`);
}
const easy = new Set(['capital','n20','n19','n18','n17','n16','n15','n14','n13','center']);
assert.ok(CAPITAL_GRID_PRESETS.beginner.contracts.every(id=>easy.has(id)), 'débutant accessible');
assert.ok(CAPITAL_GRID_PRESETS.intermediate.contracts.some(id=>easy.has(id)));
assert.ok(CAPITAL_GRID_PRESETS.intermediate.contracts.some(id=>!easy.has(id)));
assert.ok(CAPITAL_GRID_PRESETS.expert.contracts.slice(1).every(id=>!easy.has(id)), 'expert sans contrats faciles');
const allContracts = new Set(['capital',...CAPITAL_SELECTABLE_CONTRACTS]);
for (const p of Object.values(CAPITAL_GRID_PRESETS)) for(const id of p.contracts) assert.ok(allContracts.has(id), id);

const start = capitalPresetContracts('alpes17');
start[10]='exact_42';
assert.equal(CAPITAL_GRID_PRESETS.alpes17.contracts[10], 'peluche', 'mutation accidentelle du modèle');

// Les nouvelles variantes sont des grilles : chaque contrat utilise le moteur déjà testé V142.
assert.equal(applyCapitalVisit(100, 'exact_42', [{v:20,mult:1},{v:20,mult:1},{v:2,mult:1}]).scoreAfter, 142);
assert.equal(applyCapitalVisit(100, 'shanghai', [{v:5,mult:1},{v:5,mult:2},{v:5,mult:3}]).scoreAfter,130);

const config = readFileSync(new URL('../src/pages/CapitalConfig.tsx', import.meta.url),'utf8');
const play = readFileSync(new URL('../src/pages/CapitalPlay.tsx', import.meta.url),'utf8');
for (const needle of ['Catégorie CAPITAL','CAPITAL_CUSTOM_VARIANT_LABEL','PERSONNALISÉ · Grille de départ','CAPITAL_PRESET_ORDER','capitalPresetContracts(gridVariant, committeeSpecialContract)','setMode("custom")', 'setMode("official")', 'Contrat de remplacement (Peluche)']) assert.ok(config.includes(needle), needle);
assert.ok(play.includes('CAPITAL_GRID_PRESETS[cfg.gridVariant || "clubs15"]'), 'le play doit afficher la variante');
console.log('CAPITAL V143 : 13 variantes validées, difficulté et comité, import personnalisé, anciennes grilles V142 préservées.');
