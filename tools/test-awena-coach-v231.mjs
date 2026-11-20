// Run from project root: node tools/test-awena-coach-v231.mjs
// Standalone validation without installing application dependencies.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); }
catch { ts = require(resolve(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(), 'typescript')); }
const root = resolve(import.meta.dirname, '..');
const cache = new Map();
function load(relative) {
  const file = resolve(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  assert(existsSync(file), `Missing ${relative}`);
  const result = ts.transpileModule(readFileSync(file, 'utf8'), {
    fileName: file, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const errors = (result.diagnostics || []).filter(x => x.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, `${relative}: TypeScript syntax`);
  const exports = { exports: {} };
  cache.set(file, exports);
  new Function('require', 'module', 'exports', result.outputText)((specifier) => {
    if (specifier.startsWith('.')) {
      const target = resolve(dirname(file), specifier);
      for (const extension of ['', '.ts', '.tsx']) if (existsSync(target + extension)) return load(target + extension);
    }
    throw new Error(`Unexpected import ${specifier}`);
  }, exports, exports.exports);
  return exports.exports;
}
const data = new Map();
globalThis.localStorage = {
  getItem: key => data.get(key) ?? null,
  setItem: (key, value) => { data.set(key, String(value)); },
  removeItem: key => data.delete(key),
};
const coach = load('src/training/academy/academyCoach.ts');
const { MSS_ACADEMY_CATALOGUE: catalogue } = load('src/training/academy/academyCatalogue.ts');
const { getAcademyQuestions } = load('src/training/academy/academyQuizBank.ts');
const review = load('src/training/academy/academyRevision.ts');
const testTime = new Date(2026, 10, 19, 11, 0); // Thursday, 19 November
const nextMonday = new Date(2026, 10, 23, 11, 0);
assert.equal(coach.academyCoachWeek(testTime), '2026-11-16');
assert.equal(coach.academyCoachWeek(nextMonday), '2026-11-23');
assert.equal(coach.academyCoachWeek(new Date(2027,0,1)), '2026-12-28');
assert(catalogue.length >= 48);
const count = catalogue.reduce((total, lesson) => total + getAcademyQuestions(lesson).length, 0);
assert(count >= 141);
const first = coach.loadOrCreateAcademyCoachPlan('ninja', catalogue, {}, {}, null, testTime);
assert.deepEqual(first.steps.map(step => step.action), ['lesson','practice','quiz']);
assert.equal(first.steps.length, 3);
assert.equal(coach.academyCoachCompletedCount(first), 0);
const done = coach.completeAcademyCoachStep('ninja', first, 0, testTime.getTime());
assert.equal(coach.academyCoachCompletedCount(done), 1);
assert.equal(coach.academyCoachNextStep(done), 1);
assert.strictEqual(coach.completeAcademyCoachStep('ninja', done, 0, testTime.getTime()), done, 'Idempotent completion');
assert.equal(coach.academyCoachCompletedCount(coach.loadOrCreateAcademyCoachPlan('ninja', catalogue, {}, {}, null, testTime)), 1, 'Persisted');
assert.equal(coach.academyCoachCompletedCount(coach.loadOrCreateAcademyCoachPlan('jess', catalogue, {}, {}, null, testTime)), 0, 'Profiles isolated');
assert.equal(coach.academyCoachCompletedCount(coach.loadOrCreateAcademyCoachPlan('ninja', catalogue, {}, {}, null, nextMonday)), 0, 'Week renewal');
assert.equal(coach.completeAcademyCoachStep('ninja', first, 2, nextMonday.getTime()), first, 'Old week cannot be completed');
const key = coach.academyCoachKey('ninja');
data.set(key, '{broken JSON');
assert.equal(coach.loadOrCreateAcademyCoachPlan('ninja', catalogue, {}, {}, null, testTime).steps.length, 3, 'Corruption fallback');
const finishLesson = catalogue.find(l => l.id.startsWith('finish-do-'));
assert(finishLesson);
const focused = coach.createAcademyCoachPlan(catalogue, {}, {}, finishLesson.id, testTime);
assert.equal(focused.steps[1].lessonId, finishLesson.id, 'Finish DO prioritization');
assert.equal(focused.steps[1].action, 'practice');
const errorId = `${catalogue[0].id}:0`;
review.saveAcademyAnswer('ninja', errorId, false, 'lesson', testTime.getTime());
const journal = review.loadAcademyReviews('ninja');
const personalized = coach.createAcademyCoachPlan(catalogue, {}, journal, null, testTime);
assert.equal(personalized.steps[0].action, 'review', 'Due errors prioritized');
assert.equal(personalized.steps[0].lessonId, catalogue[0].id);
const jsx = readFileSync(resolve(root, 'src/training/academy/TrainingAwenaAcademy.tsx'), 'utf8');
const css = readFileSync(resolve(root, 'src/training/academy/trainingAwenaAcademy.css'), 'utf8');
const checkSyntax = ts.transpileModule(jsx, { fileName: 'TrainingAwenaAcademy.tsx', reportDiagnostics: true,
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } });
assert.equal((checkSyntax.diagnostics || []).filter(x => x.category === ts.DiagnosticCategory.Error).length, 0, 'Academy TSX syntax');
for (const token of ['mssAcademyCoach', 'startCoachSession', 'completeAcademyCoachStep', 'markCoachCompleted(coachActiveStep)',
  'startReviewRound(index)', 'startQuizRound(index)', 'FinishDoWeeklyPanel', 'mssAcademyTabs']) {
  assert(jsx.includes(token), `Missing UI contract: ${token}`);
}
for (const token of ['.mssAcademyCoachSteps', '.mssAcademyCoachTrack', '@media(max-width:540px)'])
  assert(css.includes(token), `Missing compact CSS: ${token}`);
console.log(`PASS V231 coach : ${catalogue.length} leçons, ${count} questions, 3 séances/semaine, profils isolés, révisions, Finish DO, persistence, TSX`);
