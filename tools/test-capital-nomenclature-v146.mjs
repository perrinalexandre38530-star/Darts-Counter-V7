import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CAPITAL_GRID_PRESETS, CAPITAL_PRESET_ORDER, CAPITAL_PRESET_GROUPS,
  CAPITAL_CUSTOM_VARIANT_LABEL, capitalPresetContracts,
} from '../src/lib/capitalGame.ts';

// Contrats inchangés ; les noms sont définis une seule fois pour config, partie, aide et historique.
const expectedLabels = {
  clubs15: 'OFFICIEL · 15 tours',
  inverse15: 'CAPITAL À REBOURS · 15 tours',
  committee15: 'CAPITAL HÉRITAGE · 15 tours',
  bar17: 'CAPITAL DIAGONALE · 17 tours',
  modern17: 'CAPITAL NOUVELLE DONNE · 17 tours',
  alpes17: 'CAPITAL DES ALPES · 17 tours',
  committee_shanghai17: 'CAPITAL SHANGHAI · 17 tours',
  committee_42_17: 'CAPITAL 42 · 17 tours',
  committee_petit17: 'CAPITAL ÉCONOME · 17 tours',
  committee_other17: 'CAPITAL À LA CARTE · 17 tours',
  beginner: 'CAPITAL DÉCOUVERTE · 10 tours',
  intermediate: 'CAPITAL STRATÉGIE · 13 tours',
  expert: 'CAPITAL MAÎTRISE · 13 tours',
};
assert.equal(CAPITAL_PRESET_ORDER.length, 13);
assert.deepEqual(Object.keys(expectedLabels).sort(), [...CAPITAL_PRESET_ORDER].sort());
assert.equal(new Set(Object.values(expectedLabels)).size, 13);
for (const id of CAPITAL_PRESET_ORDER) {
  const preset = CAPITAL_GRID_PRESETS[id];
  assert.equal(preset.label, expectedLabels[id], `nom de ${id}`);
  assert.equal(preset.contracts.length, Number(preset.label.match(/(\d+) tours/)?.[1]), `tours ${id}`);
  assert.ok(preset.description.length > 50, `description ${id}`);
  assert.deepEqual(capitalPresetContracts(id), preset.contracts, `règles ${id}`);
}
assert.equal(CAPITAL_CUSTOM_VARIANT_LABEL, 'PERSONNALISÉ · sur mesure');
assert.equal(CAPITAL_PRESET_GROUPS.length, 5);
assert.equal(CAPITAL_PRESET_GROUPS.flatMap(g => g.contracts).length + 1, 14);
assert.deepEqual(CAPITAL_PRESET_GROUPS.map(g => g.label), ['CLUBS','BAR','MODERNE','COMITÉS','NIVEAUX']);
assert.match(CAPITAL_GRID_PRESETS.bar17.description, /Bars.*Capital Darts/);
assert.match(CAPITAL_GRID_PRESETS.modern17.description, /Moderne.*Peluche/);
assert.match(CAPITAL_GRID_PRESETS.alpes17.description, /comité des Alpes/);
assert.match(CAPITAL_GRID_PRESETS.beginner.description, /Niveau débutant/);
assert.match(CAPITAL_GRID_PRESETS.intermediate.description, /Niveau intermédiaire/);
assert.match(CAPITAL_GRID_PRESETS.expert.description, /Niveau expert/);
const config = readFileSync(new URL('../src/pages/CapitalConfig.tsx', import.meta.url), 'utf8');
const play = readFileSync(new URL('../src/pages/CapitalPlay.tsx', import.meta.url), 'utf8');
assert.ok(config.includes('CAPITAL_GRID_PRESETS[id].label'), 'liste de variantes');
assert.ok(config.includes('CAPITAL_GRID_PRESETS[gridVariant].label'), 'récapitulatif de variantes');
assert.ok(config.includes('CAPITAL_GRID_PRESETS[gridVariant].description'), 'description de variantes');
assert.ok(play.includes('CAPITAL_GRID_PRESETS[cfg.gridVariant || "clubs15"]'), 'nom en cours de partie');
assert.ok(config.includes('CAPITAL À REBOURS') && config.includes('CAPITAL MAÎTRISE'), 'aide config V146');
assert.ok(play.includes('CAPITAL À REBOURS') && play.includes('MAÎTRISE'), 'aide partie V146');
assert.ok(config.includes('label: "PERSONNALISÉ"'), 'option personnalisée maintenue');
console.log('CAPITAL V146 : 14 variantes, noms MSS, catégorie et aide cohérentes ; grilles préservées.');
