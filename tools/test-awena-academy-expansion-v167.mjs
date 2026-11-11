// Run: node tools/test-awena-academy-expansion-v167.mjs
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); }
catch { ts = require(resolve(execFileSync('npm', ['root', '-g'], {encoding:'utf8'}).trim(), 'typescript')); }
const root = resolve(import.meta.dirname, '..');
const cache = new Map();
function load(relative) {
  const file = resolve(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  assert(existsSync(file), `Missing ${file}`);
  const code = readFileSync(file, 'utf8');
  const compiled = ts.transpileModule(code, {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    reportDiagnostics: true,
  });
  const errors = (compiled.diagnostics || []).filter(diag => diag.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, `${relative} TS syntax: ${errors.map(e => ts.flattenDiagnosticMessageText(e.messageText, '\n')).join('; ')}`);
  const obj = { exports: {} }; cache.set(file, obj);
  const req = (specifier) => {
    if (specifier.endsWith('.css')) return {};
    if (specifier.startsWith('.')) {
      const child = resolve(dirname(file), specifier);
      for (const suffix of ['', '.ts', '.tsx']) if (existsSync(child + suffix)) return load(child + suffix);
    }
    throw new Error(`Unexpected import ${specifier} in ${relative}`);
  };
  new Function('require', 'module', 'exports', compiled.outputText)(req, obj, obj.exports);
  return obj.exports;
}
const { MSS_ACADEMY_CATALOGUE } = load('src/training/academy/academyCatalogue.ts');
const { getAcademyQuestions } = load('src/training/academy/academyQuizBank.ts');
const { makeAcademyQuizRound, quizCorrectCount } = load('src/training/academy/academyQuizMode.ts');
assert.equal(MSS_ACADEMY_CATALOGUE.length, 40, '40 lessons');
assert.equal(new Set(MSS_ACADEMY_CATALOGUE.map(l => l.id)).size, 40, 'unique IDs');
const expectedLevelCounts = [1,2,3,4].map(level => MSS_ACADEMY_CATALOGUE.filter(l => l.level === level).length);
assert(expectedLevelCounts.every(n => n > 0), 'all four tiers populated');
let total = 0;
for (const lesson of MSS_ACADEMY_CATALOGUE) {
  assert(lesson.title && lesson.insight && lesson.intro && lesson.mission, lesson.id);
  assert(lesson.practice.maxDarts > 0 && lesson.practice.maxDarts % 3 === 0, `${lesson.id} maxDarts`);
  assert(['target', 'checkout', 'points'].includes(lesson.practice.kind), lesson.id);
  if (lesson.practice.kind === 'target') assert(/^(?:[SDT](?:[1-9]|1[0-9]|20)|BULL|DBULL)$/.test(lesson.practice.target), `${lesson.id} target`);
  if (lesson.practice.kind === 'checkout') assert(lesson.practice.start >= 2 && lesson.practice.start <= 170, `${lesson.id} checkout`);
  const quiz = getAcademyQuestions(lesson);
  assert.equal(quiz.length, 3, `${lesson.id} requires 3 distinct questions`);
  for (const question of quiz) {
    assert.equal(question.answers.length, 3, `${lesson.id} answers`);
    assert(Number.isInteger(question.correct) && question.correct >= 0 && question.correct <= 2, `${lesson.id} correct`);
    assert.equal(new Set(question.answers).size, 3, `${lesson.id}: duplicate options`);
    assert(question.question.length > 12 && question.explanation.length > 8, `${lesson.id}: question/explanation`);
    total++;
  }
}
assert.equal(total, 120, '120 quiz questions');
for (let offset=0; offset<12; offset++) {
  const round = makeAcademyQuizRound(MSS_ACADEMY_CATALOGUE, 10, offset);
  assert.equal(round.length, 10, `quiz round ${offset}`);
  assert.equal(new Set(round.map(q=>q.lessonId)).size, 10, 'distinct lessons per round');
  assert(new Set(round.map(q=>q.level)).size >= 3, 'mixed levels');
  assert.equal(quizCorrectCount(round, round.map(q => q.correct)), 10);
  assert.equal(quizCorrectCount(round, round.map(q => (q.correct + 1) % 3)), 0);
}
const { applyAcademyVisit, newAcademyRun, academyResultScore } = load('src/training/academy/academyCore.ts');
const practice = {kind:'checkout',start:50,maxDarts:6};
const dbull = {v:25,mult:2,score:50,label:'DBULL',miss:false,bull:false,dbull:true};
const result = applyAcademyVisit(practice,newAcademyRun(practice),[dbull]);
assert(result.won && result.darts===1);
assert.equal(academyResultScore(2/3,result,practice),90);
assert.equal(academyResultScore(true,result,practice),100);
const backing = new Map();
globalThis.localStorage={getItem:k=>backing.get(k)??null,setItem:(k,v)=>backing.set(k,v)};
const {loadAcademyProgress, saveAcademyAttempt,loadAcademyQuizStats,saveAcademyQuizRound} = load('src/training/academy/academyStore.ts');
saveAcademyAttempt('p1','reading-board',{score:100,quizCorrect:true,practiceWon:true,darts:1,busts:0});
saveAcademyAttempt('p1','reading-board',{score:90,quizCorrect:false,practiceWon:true,darts:2,busts:0,quizCorrectCount:2,quizQuestionCount:3});
assert.equal(loadAcademyProgress('p1')['reading-board'].best,100,'V166 progress kept');
assert.equal(loadAcademyProgress('p1')['reading-board'].quizCorrectCount,2);
assert.equal(Object.keys(loadAcademyProgress('p2')).length,0,'profile isolation');
saveAcademyQuizRound('p1',8,10);saveAcademyQuizRound('p1',6,10);
assert.deepEqual(loadAcademyQuizStats('p1'),{rounds:2,best:80,latest:60,questions:20,correct:14});
assert.equal(loadAcademyQuizStats('p2').rounds,0,'quiz score per profile');
const ui=readFileSync(resolve(root,'src/training/academy/TrainingAwenaAcademy.tsx'),'utf8');
assert(ui.includes('QUIZZ EXPRESS') && ui.includes('mssAcademyQuizTrack') && ui.includes('quizCorrectCount'),'UI quiz tab');
const transpile=ts.transpileModule(ui,{fileName:'TrainingAwenaAcademy.tsx',compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
assert.equal((transpile.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,'UI TSX syntax');
console.log(`Academy expansion: ${MSS_ACADEMY_CATALOGUE.length} lessons / ${total} keyed questions, quiz round rotation, finish and bust, profile isolation, TSX syntax: PASS`);
