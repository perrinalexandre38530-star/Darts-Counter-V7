import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const file = new URL('../src/lib/capitalGame.ts', import.meta.url);
const compiled = ts.transpileModule(readFileSync(file,'utf8'), {
  fileName:'capitalGame.ts',
  compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}
}).outputText;
const {
  CAPITAL_GRID_PRESETS, CAPITAL_OFFICIAL_CONTRACTS,
  CAPITAL_PRESET_GROUPS, CAPITAL_PRESET_ORDER, capitalPresetContracts,
  canonicalCapitalGridPreset, capitalContractSuccess,
} = await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(compiled));
const original = [...CAPITAL_OFFICIAL_CONTRACTS];
const expected = [
  'capital','n20','exact_57','n19','colors_3','n18','suite','n17',
  'side','n16','double_any','n15','triple_any','n14','center',
];
const miroir = capitalPresetContracts('inverse15');
assert.deepEqual(miroir, expected, 'MIROIR : inversion des seuls six contrats spéciaux');
assert.equal(miroir.length, 15, '15 tours');
assert.equal(new Set(miroir).size, 15, 'aucun contrat en double');
assert.equal(miroir[0], 'capital', 'Capital en ouverture');
assert.equal(miroir[14], 'center', 'Bull en cloture');
for (const pos of [0,1,3,5,7,9,11,13,14]) {
  assert.equal(miroir[pos], original[pos], `contrat fixe du tour ${pos+1}`);
}
const specialPositions = [2,4,6,8,10,12];
assert.deepEqual(specialPositions.map(pos => miroir[pos]),
  specialPositions.map(pos => original[pos]).reverse(),
  'seuls les contrats spéciaux sont inversés, de 57 à Triple');
assert.deepEqual(CAPITAL_OFFICIAL_CONTRACTS, original, 'OFFICIEL non muté');
assert.deepEqual(capitalPresetContracts('clubs15'), original, 'OFFICIEL intact');
assert.equal(CAPITAL_GRID_PRESETS.inverse15.label, 'MIROIR · 15 tours');
assert.match(CAPITAL_GRID_PRESETS.inverse15.description, /six contrats spéciaux/);
assert.deepEqual(CAPITAL_PRESET_GROUPS.map(g => g.label), ['CLUB','BAR','NIVEAU']);
assert.deepEqual(CAPITAL_PRESET_GROUPS.flatMap(g => g.contracts), CAPITAL_PRESET_ORDER);
assert.equal(canonicalCapitalGridPreset('alpes17'), 'modern17');
assert.deepEqual(capitalPresetContracts('alpes17'), capitalPresetContracts('modern17'));
for (const id of CAPITAL_PRESET_ORDER) {
  assert.equal(capitalPresetContracts(id).length, CAPITAL_GRID_PRESETS[id].contracts.length);
  assert.deepEqual(capitalPresetContracts(id), CAPITAL_GRID_PRESETS[id].contracts);
}
assert.equal(capitalContractSuccess('center',[{v:25,mult:1}]),true);
assert.equal(capitalContractSuccess('center',[{v:25,mult:2}]),true);
assert.equal(capitalContractSuccess('center',[{v:20,mult:3}]),false);
const custom = capitalPresetContracts('inverse15');
custom.splice(0,3);
assert.deepEqual(capitalPresetContracts('inverse15'),expected,'MON CAPITAL ne modifie pas le préréglage');
console.log('CAPITAL V150 : MIROIR inverse uniquement les six contrats spéciaux, chiffres/BULL fixes, 15 tours, non-régressions : OK.');
