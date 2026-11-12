import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const file = new URL('../src/lib/capitalGame.ts', import.meta.url);
const source = readFileSync(file, 'utf8');
const { outputText, diagnostics } = ts.transpileModule(source, {
  fileName: 'capitalGame.ts', reportDiagnostics: true,
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
assert.deepEqual((diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error), []);
const {
  CAPITAL_CONTRACT_META, CAPITAL_GRID_PRESETS, CAPITAL_OFFICIAL_CONTRACTS,
  CAPITAL_PRESET_ORDER, CAPITAL_PRESET_GROUPS, CAPITAL_SELECTABLE_CONTRACTS,
  capitalPresetContracts, capitalContractSuccess, applyCapitalVisit, makeCapitalBotVisit,
  canonicalCapitalGridPreset,
} = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(outputText));
const d = (v, mult = 1) => ({ v, mult });

// Au centre, seul l'anneau BULL25 peut être traversé pour la DIAGONALE.
assert.equal(capitalContractSuccess('diagonal', [d(20), d(25), d(3)]), true);
assert.equal(capitalContractSuccess('diagonal', [d(1, 2), d(25), d(19, 3)]), true);
assert.equal(capitalContractSuccess('diagonal', [d(20), d(25, 2), d(3)]), false, 'DBULL50 interdit');
assert.equal(capitalContractSuccess('diagonal', [d(20), d(25), d(19)]), false, 'cible opposée obligatoire');
assert.equal(capitalContractSuccess('diagonal', [d(3), d(25), d(20)]), true, 'ordre départ opposé valide');
assert.equal(capitalContractSuccess('diagonal', [d(25), d(20), d(3)]), false, 'bull obligatoirement en deuxième');
assert.equal(applyCapitalVisit(200,'diagonal',[d(20),d(25,2),d(3)]).scoreAfter, 100, 'échec du DBULL50 = pénalité normale');
assert.equal(applyCapitalVisit(200,'diagonal',[d(20),d(25),d(3)]).scoreAfter, 248, 'réussite BULL25 = ajout de la volée');
assert.match(CAPITAL_CONTRACT_META.diagonal.rule,/DBULL50 interdit/);
const oldRandom = Math.random;
try {
  Math.random = () => 0;
  const botDarts = makeCapitalBotVisit('diagonal', 'hard');
  assert.equal(botDarts[1].v, 25);
  assert.equal(botDarts[1].mult, 1);
  assert.equal(capitalContractSuccess('diagonal',botDarts),true);
} finally { Math.random = oldRandom; }

const numeric = ['n20','n19','n18','n17','n16','n15','n14','n13'];
const expectedGroup = ['club','bar','niveau'];
assert.deepEqual(CAPITAL_PRESET_GROUPS.map(g => g.category), expectedGroup);
assert.deepEqual(CAPITAL_PRESET_GROUPS.map(g => g.contracts.length), [3,6,4]);
assert.deepEqual(CAPITAL_PRESET_GROUPS.flatMap(g => g.contracts), CAPITAL_PRESET_ORDER);
assert.equal(CAPITAL_PRESET_ORDER.length,13);
assert.equal(new Set(CAPITAL_PRESET_ORDER).size,13);
assert.deepEqual(CAPITAL_PRESET_GROUPS.find(g => g.category === 'niveau').contracts,['beginner','intermediate','expert','legends']);

for (const id of ['beginner','intermediate']) {
  const grid = capitalPresetContracts(id);
  assert.equal(grid.length,17,`${id} = 17 tours`);
  assert.equal(grid[0],'capital');
  assert.equal(grid.at(-1),'center');
  assert.deepEqual(numeric.map((_,i)=>grid[1+2*i]),numeric,`${id}: tous les nombres 20..13 à leur place`);
  for(let i=2;i<16;i+=2){
    assert.equal(numeric.includes(grid[i]),false,`${id}: contrat spécial au tour ${i+1}`);
    assert.notEqual(grid[i],'center');
    assert.notEqual(grid[i],'capital');
  }
  assert.equal(new Set(grid).size,17,`${id}: pas de répétition`);
}
assert.deepEqual(capitalPresetContracts('beginner').filter(x=>!numeric.includes(x) && !['capital','center'].includes(x)),[
  'double_any','triple_any','four_corners','even_3','odd_3','peluche','exact_42',
]);
assert.deepEqual(capitalPresetContracts('intermediate').filter(x=>!numeric.includes(x) && !['capital','center'].includes(x)),[
  'shanghai','diagonal','packet','outer_single','side','poubelle','exact_69',
]);
const expert = capitalPresetContracts('expert');
assert.equal(expert.length,18);
assert.equal(expert[0],'capital');
assert.equal(expert.at(-1),'center');
assert.equal(expert.some(id => numeric.includes(id)),false,'EXPERT aucun contrat numérique');
assert.equal(expert.includes('peluche'),false,'EXPERT retire les défis de découverte');
assert.equal(expert.includes('four_corners'),false,'EXPERT retire les défis de découverte');
assert.equal(new Set(expert).size,18);
for (const hard of ['shanghai','diagonal','poubelle','bad_hand','packet','outer_single','exact_custom']) {
  assert.equal(expert.includes(hard),true,`EXPERT : ${hard}`);
}
const legends = capitalPresetContracts('legends');
assert.equal(legends.length,30);
assert.equal(legends[0],'capital');
assert.equal(legends.at(-1),'center');
assert.deepEqual(numeric.every(id=>legends.includes(id)),true);
assert.equal(new Set(legends).size,30,'LÉGENDES 30 contrats uniques');
assert.deepEqual([...legends].sort(),Object.keys(CAPITAL_CONTRACT_META).sort(),'LÉGENDES recouvre exactement le catalogue intégral');
assert.deepEqual([...CAPITAL_SELECTABLE_CONTRACTS,'capital'].sort(),legends.slice().sort(),'aucun contrat manquant');
for (const id of CAPITAL_PRESET_ORDER) {
  assert.deepEqual(capitalPresetContracts(id), CAPITAL_GRID_PRESETS[id].contracts,`grille ${id} cohérente`);
  assert.equal(CAPITAL_GRID_PRESETS[id].label.endsWith(`${CAPITAL_GRID_PRESETS[id].contracts.length} tours`),true);
}
// Non régression : grilles historiques, anciennes sauvegardes et copie defensive.
assert.equal(canonicalCapitalGridPreset('alpes17'),'modern17');
assert.deepEqual(capitalPresetContracts('clubs15'),CAPITAL_OFFICIAL_CONTRACTS);
assert.deepEqual(capitalPresetContracts('inverse15'),[
 'capital','n20','exact_57','n19','colors_3','n18','suite','n17','side','n16','double_any','n15','triple_any','n14','center',
]);
const copy=capitalPresetContracts('legends');copy.pop();
assert.equal(capitalPresetContracts('legends').length,30);

// MON CAPITAL peut dupliquer LÉGENDES : 29 contrats hors CAP, stockage local sans troncature.
const savedSource = ts.transpileModule(readFileSync(new URL('../src/lib/capitalSavedVariants.ts', import.meta.url),'utf8'), {
  fileName: 'capitalSavedVariants.ts',
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText.replaceAll('from "./capitalGame"', `from "data:text/javascript;charset=utf-8,${encodeURIComponent(outputText)}"`);
const {normalizeCapitalSavedVariant, persistCapitalSavedVariants, loadCapitalSavedVariants} =
  await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(savedSource));
const legendCustom = normalizeCapitalSavedVariant({
  id:'legend-me', name:'Légendes maison', basePreset:'legends',
  contracts:legends.filter(id=>id!=='capital'),includeCapital:true,maxCustomContracts:29,
  exactTarget:99,createdAt:10,updatedAt:10,
});
assert.ok(legendCustom);
assert.equal(legendCustom.basePreset,'legends');
assert.equal(legendCustom.contracts.length,29);
const memory = new Map();
assert.equal(persistCapitalSavedVariants([legendCustom],{setItem:(k,v)=>memory.set(k,v)}),true);
const stored = loadCapitalSavedVariants({getItem:k=>memory.get(k)??null});
assert.equal(stored[0]?.contracts.length,29);
assert.equal(stored[0]?.basePreset,'legends');

const config = readFileSync(new URL('../src/pages/CapitalConfig.tsx',import.meta.url),'utf8');
const play = readFileSync(new URL('../src/pages/CapitalPlay.tsx',import.meta.url),'utf8');
for (const s of [config,play]) {
  assert.match(s,/LÉGENDES/);
  assert.match(s,/DBULL50/);
}
assert.match(config,/CAPITAL_PRESET_GROUPS\.find/);
assert.match(config,/CAPITAL_PRESET_ORDER\.map/);
assert.match(config,/loadNamedVariant/);
assert.match(play,/capitalPresetContracts\(cfg\.gridVariant/);
console.log('CAPITAL V151 : DIAGONALE BULL25 seul, STANDARD 17, CHALLENGER 17, EXPERT 18, LÉGENDES 30 et non-régressions OK.');
