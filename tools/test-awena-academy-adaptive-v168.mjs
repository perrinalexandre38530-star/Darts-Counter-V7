// Run: node tools/test-awena-academy-adaptive-v168.mjs
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
    fileName:file, compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true,
  });
  const errors = (compiled.diagnostics || []).filter(diag => diag.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length,0,`${relative}: ${errors.map(e => ts.flattenDiagnosticMessageText(e.messageText,'\n')).join('; ')}`);
  const obj = {exports:{}}; cache.set(file,obj);
  new Function('require','module','exports',compiled.outputText)((specifier) => {
    if (specifier.endsWith('.css')) return {};
    if (specifier.startsWith('.')) {
      const child=resolve(dirname(file),specifier);
      for (const ext of ['', '.ts', '.tsx']) if(existsSync(child+ext)) return load(child+ext);
    }
    throw Error(`Unexpected dependency ${specifier}`);
  },obj,obj.exports);
  return obj.exports;
}
const files = new Map();
globalThis.localStorage = {
  getItem: key => files.get(key) ?? null,
  setItem: (key,value) => files.set(key,String(value)),
};
const {
  academyRevisionStoreKey,loadAcademyReviews,saveAcademyAnswer,makeAcademyReviewRound,getAcademyReviewInsights
} = load('src/training/academy/academyRevision.ts');
const {MSS_ACADEMY_CATALOGUE} = load('src/training/academy/academyCatalogue.ts');
const {loadAcademyQuizStats,saveAcademyQuizRound,loadAcademyProgress,saveAcademyAttempt} = load('src/training/academy/academyStore.ts');
assert.equal(MSS_ACADEMY_CATALOGUE.length,40);
const NOW=1760000000000, DAY=86400000;
const a='reading-board:0', b='mental-score:1', c='reading-board:2';
assert.equal(getAcademyReviewInsights(MSS_ACADEMY_CATALOGUE,{},NOW).due,0);
assert.equal(makeAcademyReviewRound(MSS_ACADEMY_CATALOGUE,{},10,NOW).length,0);
let journal=saveAcademyAnswer('player-1',a,false,'lesson',NOW);
assert.equal(journal[a].errors,1);
assert.equal(journal[a].dueAt,NOW);
assert.equal(journal[a].streak,0);
assert.equal(getAcademyReviewInsights(MSS_ACADEMY_CATALOGUE,journal,NOW).due,1);
assert.deepEqual(makeAcademyReviewRound(MSS_ACADEMY_CATALOGUE,journal,10,NOW).map(q=>q.id),[a]);
assert.equal(Object.keys(loadAcademyReviews('player-2')).length,0,'progress per profile');
assert.equal(loadAcademyQuizStats('player-1').rounds,0,'review event is not express quiz');
assert.equal(Object.keys(loadAcademyProgress('player-1')).length,0,'old lesson records unchanged');
journal=saveAcademyAnswer('player-1',b,false,'express',NOW+1);
journal=saveAcademyAnswer('player-1',c,false,'express',NOW+2);
assert.equal(getAcademyReviewInsights(MSS_ACADEMY_CATALOGUE,journal,NOW+2).due,3);
const chosen=makeAcademyReviewRound(MSS_ACADEMY_CATALOGUE,journal,10,NOW+2);
assert.equal(chosen.length,3);
assert.notEqual(chosen[0].lessonId,chosen[1].lessonId,'interleave lessons with available questions');
assert(chosen.every(item => item.answers.length===3 && item.explanation),'full question for each review');
// Success means 1 day before next repetition, followed by 3 days, 7 days / mastery.
journal=saveAcademyAnswer('player-1',a,true,'review',NOW+3);
assert.equal(journal[a].streak,1);
assert.equal(journal[a].dueAt,NOW+3+DAY);
assert.equal(journal[a].reviewCorrect,1);
assert(!makeAcademyReviewRound(MSS_ACADEMY_CATALOGUE,journal,10,NOW+4).some(item=>item.id===a),'not due after success');
assert(makeAcademyReviewRound(MSS_ACADEMY_CATALOGUE,journal,10,NOW+3+DAY).some(item=>item.id===a),'due after one day');
journal=saveAcademyAnswer('player-1',a,true,'review',NOW+3+DAY);
assert.equal(journal[a].streak,2);
assert.equal(journal[a].dueAt,NOW+3+4*DAY);
journal=saveAcademyAnswer('player-1',a,true,'review',NOW+3+4*DAY);
assert.equal(journal[a].streak,3);
assert.equal(journal[a].dueAt,NOW+3+11*DAY);
assert.equal(getAcademyReviewInsights(MSS_ACADEMY_CATALOGUE,journal,NOW+3+11*DAY).mastered,1);
assert(!makeAcademyReviewRound(MSS_ACADEMY_CATALOGUE,journal,10,NOW+3+30*DAY).some(item=>item.id===a),'mastered not reselected');
// A new mistake safely resets the streak and allows immediate targeted remediation.
journal=saveAcademyAnswer('player-1',a,false,'lesson',NOW+3+12*DAY);
assert.equal(journal[a].streak,0);
assert.equal(journal[a].errors,2);
assert(makeAcademyReviewRound(MSS_ACADEMY_CATALOGUE,journal,10,NOW+3+12*DAY).some(item=>item.id===a));
assert.equal(getAcademyReviewInsights(MSS_ACADEMY_CATALOGUE,journal,NOW+3+12*DAY).focusLessonId,'reading-board');
const untouched=loadAcademyReviews('player-2');
assert.deepEqual(untouched,{});
assert.notEqual(academyRevisionStoreKey('player-1'),academyRevisionStoreKey('player-2'));
assert.equal(Object.keys(loadAcademyReviews('player-1')).length,3);
assert.equal(Object.keys(loadAcademyReviews('player-1')).length,3,'no duplicate question IDs');
// V166 and V167 scores coexist, remain untouched by revisions.
saveAcademyAttempt('player-1','reading-board',{score:80,quizCorrect:false,practiceWon:true,darts:3,busts:0,quizCorrectCount:2,quizQuestionCount:3});
saveAcademyQuizRound('player-1',7,10);
const beforeOld = JSON.stringify(loadAcademyProgress('player-1'));
const beforeQuiz = JSON.stringify(loadAcademyQuizStats('player-1'));
saveAcademyAnswer('player-1',b,true,'review',NOW+20*DAY);
assert.equal(JSON.stringify(loadAcademyProgress('player-1')),beforeOld);
assert.equal(JSON.stringify(loadAcademyQuizStats('player-1')),beforeQuiz);
// Bad local storage data must never crash the academy or leak between profiles.
files.set(academyRevisionStoreKey('broken'),'{bad json');
assert.deepEqual(loadAcademyReviews('broken'),{});
saveAcademyAnswer('player-1','INVALID-KEY',true,'lesson',NOW);
assert.equal(Object.keys(loadAcademyReviews('player-1')).length,3);
const ui=readFileSync(resolve(root,'src/training/academy/TrainingAwenaAcademy.tsx'),'utf8');
assert(ui.includes('MES RÉVISIONS') && ui.includes('reviewJournal') && ui.includes('newReviewRound'));
assert(ui.includes('noteAnswer(`${lesson!.id}:${quizIndex}`') && ui.includes('noteAnswer(item.id'));
assert(ui.includes('if (roundMode === "express") setQuizStats('),'review does not mutate express scores');
assert(ui.includes('EXERCICE SUR LA CIBLE') && ui.includes('setRoundMode(next === "review"'));
const compiled=ts.transpileModule(ui,{fileName:'TrainingAwenaAcademy.tsx',compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
assert.equal((compiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
console.log('Awena adaptive V168: due-now / 1-3-7d / mastery / relapse / mixed review / quiz and History independence / profiles / TSX syntax: PASS');
