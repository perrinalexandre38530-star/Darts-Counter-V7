import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Vite accepte les imports TS sans extension ; les tests Node chargent des modules
// transpiles en memoire pour s'executer sans modifier les fichiers de production.
const compile = (file) => ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
  fileName: file,
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const dataUrl = (source) => 'data:text/javascript;charset=utf-8,' + encodeURIComponent(source);
const capitalGameUrl = dataUrl(compile('../src/lib/capitalGame.ts'));
const savedVariantSource = compile('../src/lib/capitalSavedVariants.ts')
  .replaceAll('from "./capitalGame"', `from "${capitalGameUrl}"`);
const {
  CAPITAL_GRID_PRESETS, CAPITAL_PRESET_ORDER, CAPITAL_PRESET_GROUPS,
  CAPITAL_CUSTOM_VARIANT_LABEL, canonicalCapitalGridPreset, capitalPresetContracts,
} = await import(capitalGameUrl);
const {
  CAPITAL_SAVED_VARIANTS_KEY, normalizeCapitalSavedVariant,
  loadCapitalSavedVariants, persistCapitalSavedVariants,
} = await import(dataUrl(savedVariantSource));

assert.deepEqual(CAPITAL_PRESET_GROUPS.map(g => g.label), ['CLUB', 'BAR', 'NIVEAU']);
assert.equal(CAPITAL_PRESET_GROUPS.length + 1, 4);
assert.deepEqual(CAPITAL_PRESET_GROUPS.map(g => g.contracts.length), [3, 6, 3]);
assert.equal(CAPITAL_PRESET_ORDER.length, 12);
assert.deepEqual(CAPITAL_PRESET_GROUPS.flatMap(g => g.contracts), CAPITAL_PRESET_ORDER);
assert.equal(new Set(CAPITAL_PRESET_ORDER).size, 12);
assert.equal(CAPITAL_GRID_PRESETS.clubs15.label, 'OFFICIEL · 15 tours');
assert.deepEqual(['beginner','intermediate','expert'].map(id => CAPITAL_GRID_PRESETS[id].label.split(' · ')[0]), ['STANDARD','CHALLENGER','EXPERT']);
assert.equal(canonicalCapitalGridPreset('alpes17'), 'modern17');
assert.deepEqual(capitalPresetContracts('alpes17'), capitalPresetContracts('modern17'));
assert.equal(CAPITAL_PRESET_ORDER.includes('alpes17'), false);
assert.equal(CAPITAL_CUSTOM_VARIANT_LABEL, 'MON CAPITAL · variante personnelle');
for(const id of CAPITAL_PRESET_ORDER) {
  assert.deepEqual(capitalPresetContracts(id), CAPITAL_GRID_PRESETS[id].contracts, `preset ${id}`);
  assert.equal(CAPITAL_GRID_PRESETS[id].label.includes('tours'), true);
}
for(const group of CAPITAL_PRESET_GROUPS) for(const id of group.contracts) {
  assert.equal(CAPITAL_GRID_PRESETS[id].category, group.category, `cat ${id}`);
}
const baseline = structuredClone(CAPITAL_GRID_PRESETS.clubs15.contracts);
const first = capitalPresetContracts('clubs15'); first.splice(2,1);
assert.deepEqual(capitalPresetContracts('clubs15'), baseline, 'modele non modifie');
const different = capitalPresetContracts('committee_other17','exact_69');
assert.equal(different.includes('exact_69'), true);
assert.equal(different.includes('peluche'), false);
assert.equal(capitalPresetContracts('committee_shanghai17').includes('shanghai'), true);
assert.equal(capitalPresetContracts('committee_other17').includes('shanghai'), true, 'ancienne configuration sans choix explicite');
assert.equal(capitalPresetContracts('committee_other17','exact_69').includes('exact_69'), true, 'nouveau choix par defaut dans le menu');
assert.equal(capitalPresetContracts('committee_other17','shanghai').includes('shanghai'), true, 'ancien choix explicitement sauvegarde');

const store = new Map();
const browserStorage = { getItem: key => store.get(key) ?? null, setItem: (key,v) => store.set(key,v) };
assert.deepEqual(loadCapitalSavedVariants(browserStorage), []);
const created = normalizeCapitalSavedVariant({
 id: 'my-1', name:' Capital du vendredi ', basePreset:'alpes17', contracts:['n20','shanghai','n19','shanghai','invalid'],
 includeCapital:true, maxCustomContracts:15, exactTarget:42, shanghaiBonus:50,
 packetAllowMultipliers:true, failDivideBy2:false, startingCapital:301,
 victoryMode:'first_to_target', targetScore:700, tieBreaker:'none', createdAt:20, updatedAt:30
});
assert.ok(created);
assert.equal(created.name, 'Capital du vendredi');
assert.equal(created.basePreset,'modern17');
assert.deepEqual(created.contracts,['n20','shanghai','n19']);
assert.equal(persistCapitalSavedVariants([created],browserStorage),true);
assert.equal(store.has(CAPITAL_SAVED_VARIANTS_KEY),true);
const reloaded=loadCapitalSavedVariants(browserStorage);
assert.equal(reloaded.length,1);
assert.deepEqual(reloaded[0],created);
const renamed = {...reloaded[0],name:' Mon tournoi ',contracts:['packet','exact_42'],updatedAt:50};
assert.equal(persistCapitalSavedVariants([renamed],browserStorage),true);
assert.equal(loadCapitalSavedVariants(browserStorage)[0].name,'Mon tournoi');
assert.deepEqual(loadCapitalSavedVariants(browserStorage)[0].contracts,['packet','exact_42']);
assert.equal(persistCapitalSavedVariants([{...created,id:'two',name:'MON TOURNOI'}, renamed],browserStorage),false,'noms uniques sans casse');
assert.equal(loadCapitalSavedVariants(browserStorage).length,1,'echec sans destruction');
assert.equal(persistCapitalSavedVariants([],browserStorage),true);
assert.deepEqual(loadCapitalSavedVariants(browserStorage),[]);
assert.equal(persistCapitalSavedVariants([created],{setItem(){throw new Error('storage full')}}),false);
assert.deepEqual(loadCapitalSavedVariants({getItem(){throw Error('private mode')}}),[]);
assert.equal(normalizeCapitalSavedVariant({id:'a',name:'',contracts:['n20']}),null);

const config = readFileSync(new URL('../src/pages/CapitalConfig.tsx', import.meta.url),'utf8');
const play = readFileSync(new URL('../src/pages/CapitalPlay.tsx', import.meta.url),'utf8');
assert.match(config, /label: "MON CAPITAL"/);
assert.match(config, /loadNamedVariant/);
assert.match(config, /saveNamedVariant/);
assert.match(config, /persistCapitalSavedVariants/);
assert.match(config, /deleteNamedVariant/);
assert.match(config, /Enregistrer une copie/);
assert.match(config, /Créer une nouvelle variante depuis cette base/);
assert.match(config, /canonicalCapitalGridPreset\(restoredConfig.gridVariant\)/);
assert.match(config, /: "exact_69"/, 'defaut du nouveau menu evite une seconde grille Shanghai');
assert.match(play, /cfg.savedVariantName \|\| CAPITAL_CUSTOM_VARIANT_LABEL/);
console.log('CAPITAL V147 : 4 catégories, grilles dédoublonnées, rétrocompatibilité et gestion locale des variantes nommées OK.');
