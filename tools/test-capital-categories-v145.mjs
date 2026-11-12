import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CAPITAL_GRID_PRESETS, CAPITAL_PRESET_ORDER, CAPITAL_PRESET_GROUPS,
  CAPITAL_OFFICIAL_CONTRACTS, CAPITAL_CUSTOM_VARIANT_LABEL, capitalPresetContracts,
} from '../src/lib/capitalGame.ts';

const expected = {
  club: ['clubs15', 'inverse15', 'committee15'],
  bar: ['bar17'],
  moderne: ['modern17'],
  comite: ['alpes17', 'committee_shanghai17', 'committee_42_17', 'committee_petit17', 'committee_other17'],
  niveau: ['beginner', 'intermediate', 'expert'],
};
const flat = CAPITAL_PRESET_GROUPS.flatMap(g => g.contracts);
assert.equal(flat.length, 13, 'Toutes les 13 grilles prédéfinies doivent être classées');
assert.equal(new Set(flat).size, 13, 'Chaque grille appartient à une seule catégorie');
assert.deepEqual(flat, CAPITAL_PRESET_ORDER, 'Ordre du menu identique à l’ordre des groupes');
for (const group of CAPITAL_PRESET_GROUPS) {
  assert.deepEqual(group.contracts, expected[group.category], `catégorie ${group.category}`);
  for (const id of group.contracts) {
    assert.equal(CAPITAL_GRID_PRESETS[id].category, group.category, `${id} mal classé`);
    assert.ok(CAPITAL_GRID_PRESETS[id].label.length > 5, `titre ${id}`);
  }
}
assert.equal(CAPITAL_PRESET_GROUPS.length, 5);
assert.equal(CAPITAL_PRESET_GROUPS.length + 1, 6, '5 catégories de préréglages et personnalisé');
assert.equal(CAPITAL_PRESET_ORDER.length + 1, 14, '13 grilles et 1 personnalisée');
assert.equal(CAPITAL_CUSTOM_VARIANT_LABEL, 'PERSONNALISÉ · sur mesure');
assert.equal(CAPITAL_GRID_PRESETS.clubs15.label, 'OFFICIEL · 15 tours');
assert.equal(CAPITAL_GRID_PRESETS.bar17.label, 'CAPITAL DIAGONALE · 17 tours');
assert.equal(CAPITAL_GRID_PRESETS.modern17.label, 'CAPITAL NOUVELLE DONNE · 17 tours');
assert.equal(CAPITAL_GRID_PRESETS.committee15.label, 'CAPITAL HÉRITAGE · 15 tours');
assert.deepEqual(capitalPresetContracts('clubs15'), CAPITAL_OFFICIAL_CONTRACTS);
assert.equal(capitalPresetContracts('alpes17')[10], 'peluche');
assert.equal(capitalPresetContracts('committee_other17','exact_69')[10], 'exact_69');
const config = readFileSync(new URL('../src/pages/CapitalConfig.tsx', import.meta.url), 'utf8');
for (const token of ['CAPITAL_PRESET_GROUPS.map(group', 'aria-pressed={active}', 'handleCategoryChange(', 'selectedPresetGroup.contracts.map(', 'mode === "custom"', 'PERSONNALISÉ · Grille de départ', 'setGridVariant(value as CapitalGridPresetId)', 'handleVariantChange("custom")']) {
  assert.ok(config.includes(token), `UI : ${token}`);
}
const play = readFileSync(new URL('../src/pages/CapitalPlay.tsx', import.meta.url), 'utf8');
assert.ok(play.includes('CAPITAL_GRID_PRESETS[cfg.gridVariant || "clubs15"]'), 'l’aide Play conserve le nom de la grille');
console.log('CAPITAL V146 : 14 choix classés, noms MSS, mode PERSONNALISÉ et compatibilité vérifiés.');
