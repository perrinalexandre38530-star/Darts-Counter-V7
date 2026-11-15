import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const read = (file) => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const names = [
  'src/training/profile/trainingCorrectiveRoute.ts',
  'src/training/profile/trainingExerciseDraft.ts',
  'src/training/ui/TrainingResultModal.tsx',
  'src/training/modes/lab/TrainingLabPlay.tsx',
  'src/training/modes/lab/TrainingCustomExercisePlay.tsx',
  'src/pages/TrainingModePage.tsx',
];
function transpile(file, module=ts.ModuleKind.CommonJS) {
  const result = ts.transpileModule(read(file), {fileName:file,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module,target:ts.ScriptTarget.ES2022}});
  assert.equal(result.diagnostics?.length || 0, 0, `${file}: TS/TSX syntax`);
  return result.outputText;
}
for (const file of names) transpile(file);
const catalogSource = read('src/training/catalog/trainingExerciseCatalog.ts');
const basics = {
  scoring:'t20_10_hits', doubles:'d16_8_hits',checkout:'checkout_32',
  precision:'s20_12_hits',bull:'bull_10_hits',regularity:'repeat_t20_6',
};
const catalog = {};
for (const [family,id] of Object.entries(basics)) {
  assert.ok(catalogSource.includes(`id: "${id}"`), `${id} must be an actual catalog exercise`);
  catalog[id] = { id, family, title:id };
}
catalog.start_exercise = {id:'start_exercise',family:'bull',title:'Séance précédente'};
const correctionExports = {};
vm.runInNewContext('(function(exports,require){'+transpile(names[0])+'\n})', {}) (correctionExports, () => ({getTrainingExercise:(id)=>catalog[id]||null}));
const build = correctionExports.buildTrainingCorrectiveRoute;
assert.equal(typeof build,'function');
for (const [family,id] of Object.entries(basics)) {
  const selected = build({id:'start_exercise',family,title:'Exercice initial'}, {success:false,precisionAvailable:true});
  assert.equal(selected.exerciseId,id);
}
const noPrecision = build(catalog.start_exercise, {success:true,precisionAvailable:false});
assert.equal(noPrecision.exerciseId,'bull_10_hits');
assert.match(noPrecision.reason,/fléchette par fléchette/);
const confirmation = build(catalog.start_exercise, {success:true,precisionAvailable:true});
assert.equal(confirmation.exerciseId,'start_exercise');
assert.equal(build({id:'missing',family:'bull'}, {success:false,precisionAvailable:true}),null);

const storage = new Map();
const draftExports = {};
const fakeContext = {
  localStorage: {getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  window: {dispatchEvent:()=>{}},Event:class Event{constructor(name){this.type=name}},
  Date,JSON,Number,Math,String,Set,Array,Object,
};
const loader = vm.runInNewContext('(function(exports,require){'+transpile(names[1])+'\n})', fakeContext);
loader(draftExports,()=>({}));
const draft={exerciseId:'bull_10_hits',participantId:'player_a',engine:'custom',savedAt:Date.now(),startedAt:Date.now(),state:{darts:6,aux:{fused:new Set([1,2])}},secondsLeft:51};
draftExports.saveTrainingExerciseDraft(draft);
const restored=draftExports.loadTrainingExerciseDraft('bull_10_hits','player_a');
assert.equal(restored.state.darts,6);
assert.equal(restored.state.aux.fused.size,2);
assert.equal(draftExports.getEffectiveDraftSeconds(restored),51);
assert.equal(draftExports.loadTrainingExerciseDraft('bull_10_hits','player_b'),null);
draftExports.clearTrainingExerciseDraft('bull_10_hits','player_a');
assert.equal(draftExports.loadTrainingExerciseDraft('bull_10_hits','player_a'),null);

const standard=read(names[3]),custom=read(names[4]),parent=read(names[5]),modal=read(names[2]);
for (const page of [standard,custom]) {
  assert.match(page,/pagehide/);
  assert.match(page,/orientationchange/);
  assert.match(page,/visibilitychange/);
  assert.match(page,/buildTrainingCorrectiveRoute/);
  assert.match(page,/onStartCorrection/);
}
assert.match(custom,/document\.hidden \|\| finishedRef\.current/);
assert.match(custom,/!foreground/);
assert.match(custom,/persistDraft\(stateRef\.current, secondsRef\.current\), 5000/);
assert.match(custom,/secondsRef\.current/);
assert.match(modal,/mssTrainingCorrectiveAction/);
assert.match(parent,/const startCorrectiveExercise/);
assert.match(parent,/getTrainingExercise\(exerciseId\)/);
assert.match(parent,/sessionKind: "exercise"/);
assert.match(parent,/onStartCorrection=\{startCorrectiveExercise\}/);
assert.match(standard,/individualExercise && onStartCorrection/);
assert.match(custom,/String\(config\?\.sessionKind \|\| "exercise"\) === "exercise"/);
const css=read('src/training/ui/trainingResponsive.css');
assert.match(css,/\.mssTrainingCorrectiveAction button/);
console.log('Training V134 Wave 9: official corrective routes, session isolation, draft state/sets, visibility, rotation, timer, TSX syntax: OK');
