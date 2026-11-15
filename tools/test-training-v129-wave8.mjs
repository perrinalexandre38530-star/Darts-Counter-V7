import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { buildTrainingTechnicalAdvice } from '../src/training/profile/trainingTechnicalCoaching.ts';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const read = path => readFileSync(new URL('../'+path, import.meta.url),'utf8');
const base = ['src/training/ui/TrainingResultModal.tsx','src/training/ui/TrainingDartPad.tsx',
 'src/training/modes/lab/TrainingLabPlay.tsx','src/training/modes/lab/TrainingCustomExercisePlay.tsx',
 'src/training/modes/challenges/ChallengesPlay.tsx'];
for (const file of base) {
 const result = ts.transpileModule(read(file),{fileName:file,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
 assert.equal(result.diagnostics?.length || 0,0,`Invalid TSX in ${file}`);
}
const empty = buildTrainingTechnicalAdvice({success:false,darts:0,hits:0,score:0});
assert.match(empty.observation,/Aucune fléchette/);
const unknown = buildTrainingTechnicalAdvice({success:false,darts:6,hits:0,score:95,precisionAvailable:false});
assert.match(unknown.observation,/précision par cible n’est pas disponible/);
assert.doesNotMatch(unknown.observation,/\d+\s*%/);
const weak = buildTrainingTechnicalAdvice({focus:'Doubles',success:false,darts:9,hits:2,score:72,precisionAvailable:true});
assert.match(weak.correction,/double ciblé/);
assert.match(weak.observation,/22 %/);
const bull = buildTrainingTechnicalAdvice({focus:'BULL',success:true,darts:9,hits:6,score:125,precisionAvailable:true});
assert.match(bull.correction,/Bull ciblé/);
const guarded = buildTrainingTechnicalAdvice({success:true,darts:-100,hits:999,score:-100,precisionAvailable:true});
assert.match(guarded.observation,/Aucune fléchette/);
const css=read('src/training/ui/trainingResponsive.css');
assert.match(css,/mssTrainingPlayOverview \{ max-height:35%; \}/);
assert.match(css,/mssTrainingInput \{ flex:1 1 65%; \}/);
assert.match(css,/orientation:landscape/);
assert.match(css,/mssTrainingCoachCorrection/);
const pad=read('src/training/ui/TrainingDartPad.tsx');
assert.match(pad,/method === "voice" && !voice\.supported/);
assert.match(pad,/aria-expanded=\{drawerOpen\}/);
const results=read('src/training/ui/TrainingResultModal.tsx');
assert.match(results,/precisionAvailable = false/);
assert.match(results,/awena\?\.say/);
for (const file of ['src/training/modes/lab/TrainingLabPlay.tsx','src/training/modes/lab/TrainingCustomExercisePlay.tsx']) {
 const source=read(file);
 assert.match(source,/aggregatedDarts \|\| 0/);
 assert.match(source,/precisionAvailable=/);
}
console.log('Training V129 Wave 8: coach, no fabricated precision, responsive, keyboard fallback, TSX syntax OK');
