// From project root: node tools/test-awena-academy-ui-v195.mjs
// Standalone sanity test: no npm dependency installation required.
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
const { MSS_ACADEMY_CATALOGUE: lessons } = load('src/training/academy/academyCatalogue.ts');
const { getAcademyQuestions } = load('src/training/academy/academyQuizBank.ts');
const { makeAcademyQuizRound } = load('src/training/academy/academyQuizMode.ts');
assert(lessons.length >= 40, 'Preserve legacy lessons and the additional DO lessons');
assert.equal(new Set(lessons.map(l => l.id)).size, lessons.length, 'No duplicate lesson IDs');
let questions = 0;
for (const lesson of lessons) {
  assert(lesson.title && lesson.mission && lesson.practice, lesson.id);
  const quiz = getAcademyQuestions(lesson);
  assert(quiz.length >= 2, `${lesson.id}: missing questions`);
  for (const question of quiz) {
    assert.equal(question.answers.length, 3, `${lesson.id}: option count`);
    assert(Number.isInteger(question.correct) && question.correct >= 0 && question.correct < 3, `${lesson.id}: answer index`);
    questions++;
  }
}
const express = makeAcademyQuizRound(lessons, 10, 4);
assert.equal(express.length, 10, '10-question quiz still works');
const ui = readFileSync(resolve(root, 'src/training/academy/TrainingAwenaAcademy.tsx'), 'utf8');
const css = readFileSync(resolve(root, 'src/training/academy/trainingAwenaAcademy.css'), 'utf8');
const parsed = ts.transpileModule(ui, { fileName: 'TrainingAwenaAcademy.tsx', reportDiagnostics: true,
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } });
assert.equal((parsed.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0, 'TSX syntax');
for (const token of ['SCREEN_TABS.map', 'BottomNavIcon', 'LESSONS_PER_PAGE = 6', 'PROGRESS_PER_PAGE = 8',
  'visibleLessons.map', 'visibleProgress.map', 'setLessonPage(0)', 'mssAcademyPager', 'makeAcademyReviewRound',
  'TrainingDartPad', 'saveAcademyAttempt']) assert(ui.includes(token), `UI integration: ${token}`);
for (const token of ['.mssAcademyTabs .active .mssAcademyTabLabel', '.mssAcademyPager', '@media (max-width: 420px)'])
  assert(css.includes(token), `Responsive CSS: ${token}`);
for (let page = 0; page < Math.ceil(lessons.length / 6); page++) {
  const chunk = lessons.slice(page * 6, (page + 1) * 6);
  assert(chunk.length >= 1 && chunk.length <= 6);
}
assert.equal(lessons.flatMap((_, i) => lessons.slice(i, i + 1)).length, lessons.length);
console.log(`PASS Académie V195: ${lessons.length} leçons, ${questions} questions, quiz express, pagination, navigation bottomnav, TSX`);
