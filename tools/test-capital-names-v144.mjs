import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CAPITAL_GRID_PRESETS, CAPITAL_PRESET_ORDER,
  CAPITAL_CUSTOM_VARIANT_LABEL,
  capitalPresetContracts,
} from '../src/lib/capitalGame.ts';
const labels = CAPITAL_PRESET_ORDER.map(id => CAPITAL_GRID_PRESETS[id].label);
assert.equal(labels.length, 13, 'Les 13 presets originaux doivent rester disponibles');
assert.equal(new Set(labels).size, 13, 'Tous les noms doivent être distincts');
const expected = {
  clubs15:'OFFICIEL · 15 tours',
  inverse15:'CAPITAL À REBOURS · 15 tours',
  bar17:'CAPITAL DIAGONALE · 17 tours',
  committee15:'CAPITAL HÉRITAGE · 15 tours',
  modern17:'CAPITAL NOUVELLE DONNE · 17 tours',
  alpes17:'CAPITAL DES ALPES · 17 tours',
  committee_shanghai17:'CAPITAL SHANGHAI · 17 tours',
  committee_42_17:'CAPITAL 42 · 17 tours',
  committee_petit17:'CAPITAL ÉCONOME · 17 tours',
  committee_other17:'CAPITAL À LA CARTE · 17 tours',
  beginner:'CAPITAL DÉCOUVERTE · 10 tours',
  intermediate:'CAPITAL STRATÉGIE · 13 tours',
  expert:'CAPITAL MAÎTRISE · 13 tours',
};
for (const id of CAPITAL_PRESET_ORDER) {
  assert.equal(CAPITAL_GRID_PRESETS[id].label, expected[id], `Nom MSS pour ${id}`);
  assert.ok(CAPITAL_GRID_PRESETS[id].description, `${id} doit préserver ses explications`);
}
assert.equal(CAPITAL_CUSTOM_VARIANT_LABEL,'PERSONNALISÉ · sur mesure');
assert.match(CAPITAL_GRID_PRESETS.bar17.description,/Capital Darts/);
assert.match(CAPITAL_GRID_PRESETS.alpes17.description,/comité des Alpes/);
assert.match(CAPITAL_GRID_PRESETS.clubs15.description,/OFFICIEL/);
for (const id of CAPITAL_PRESET_ORDER) {
  assert.deepEqual(capitalPresetContracts(id), CAPITAL_GRID_PRESETS[id].contracts, `${id}: logique préservée`);
}
const config = readFileSync(new URL('../src/pages/CapitalConfig.tsx', import.meta.url),'utf8');
const play = readFileSync(new URL('../src/pages/CapitalPlay.tsx', import.meta.url),'utf8');
assert.ok(config.includes('label="Catégorie CAPITAL"'), 'sélecteur en catégories');
assert.ok(config.includes('label: "PERSONNALISÉ"'), 'catégorie personnalisée');
assert.ok(config.includes('label="PERSONNALISÉ · Grille de départ"'),'base custom renommée');
assert.ok(config.includes('CAPITAL_GRID_PRESETS[id].label'), 'nom partagé entre la sélection et la base');
assert.ok(play.includes('cfg.mode === "custom" ? CAPITAL_CUSTOM_VARIANT_LABEL'), 'nom custom dans info partie');
console.log('CAPITAL V146 : 13 noms métiers + PERSONNALISÉ vérifiés, IDs et grilles inchangés.');
