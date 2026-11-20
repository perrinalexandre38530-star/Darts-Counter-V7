// MSS Académie Awena : test du bilan 8 semaines sans dépendances applicatives.
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
  assert(existsSync(file), `Fichier introuvable : ${relative}`);
  const transpiled = ts.transpileModule(readFileSync(file, 'utf8'), {
    fileName: file, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  assert.equal((transpiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0, `Syntaxe TS : ${relative}`);
  const module = { exports: {} };
  cache.set(file, module);
  new Function('require', 'module', 'exports', transpiled.outputText)((specifier) => {
    if (specifier.startsWith('.')) {
      const target = resolve(dirname(file), specifier);
      for (const ext of ['', '.ts', '.tsx']) if (existsSync(target + ext)) return load(target + ext);
    }
    throw Error(`Dépendance inattendue : ${specifier}`);
  }, module, module.exports);
  return module.exports;
}
const data = new Map();
globalThis.localStorage = {
  getItem: key => data.get(key) ?? null,
  setItem: (key, value) => data.set(key, String(value)),
  removeItem: key => data.delete(key),
};
const coach = load('src/training/academy/academyCoach.ts');
const { MSS_ACADEMY_CATALOGUE: catalogue } = load('src/training/academy/academyCatalogue.ts');
const { getAcademyQuestions } = load('src/training/academy/academyQuizBank.ts');
const dates = [new Date(2026, 9, 26, 12), new Date(2026, 10, 2, 12), new Date(2026, 10, 9, 12), new Date(2026, 10, 16, 12)];
const loadPlan = (who, when) => coach.loadOrCreateAcademyCoachPlan(who, catalogue, {}, {}, null, when);
const mark = (who, p, when, count) => {
  let value = p;
  for (let i = 0; i < count; i++) value = coach.completeAcademyCoachStep(who, value, i, when.getTime());
  return value;
};
// Preserve plans across renewals, no duplicate archives, no cross-profile writes.
let current = mark('ninja', loadPlan('ninja', dates[0]), dates[0], 3);
assert.equal(coach.academyCoachCompletedCount(current), 3);
current = mark('ninja', loadPlan('ninja', dates[1]), dates[1], 3);
current = mark('ninja', loadPlan('ninja', dates[2]), dates[2], 2);
current = mark('ninja', loadPlan('ninja', dates[3]), dates[3], 1);
let history = coach.loadAcademyCoachHistory('ninja');
assert.deepEqual(history.map(x => [x.week, x.completed]), [
  ['2026-10-26', 3], ['2026-11-02', 3], ['2026-11-09', 2],
]);
const report = coach.getAcademyCoachReport(current, history, dates[3]);
assert.equal(report.weeks.length, 8);
assert.equal(report.completedSessions, 9);
assert.equal(report.completedWeeks, 2);
assert.equal(report.bestWeek, 3);
assert.equal(report.streak, 0, 'Une semaine précédente incomplète casse la série');
assert.equal(report.lastWeek?.completed, 2);
assert.equal(report.weeks.at(-1)?.completed, 1);
assert.equal(coach.loadAcademyCoachHistory('jess').length, 0, 'Isolation des profils');
assert.equal(coach.getAcademyCoachReport(loadPlan('jess', dates[3]), [], dates[3]).completedSessions, 0);
// Same-week reads leave the archive unchanged.
loadPlan('ninja', dates[3]);
assert.deepEqual(coach.loadAcademyCoachHistory('ninja'), history);
// Three consecutive full weeks: current unfinished week must not mask the streak.
let other = mark('streak', loadPlan('streak', dates[0]), dates[0], 3);
other = mark('streak', loadPlan('streak', dates[1]), dates[1], 3);
other = mark('streak', loadPlan('streak', dates[2]), dates[2], 3);
other = loadPlan('streak', dates[3]);
assert.equal(coach.getAcademyCoachReport(other, coach.loadAcademyCoachHistory('streak'), dates[3]).streak, 3);
other = mark('streak', other, dates[3], 3);
assert.equal(coach.getAcademyCoachReport(other, coach.loadAcademyCoachHistory('streak'), dates[3]).streak, 4);
// Prior-week bad data must not be copied into history on renewal.
data.set(coach.academyCoachKey('broken'), '{bad json');
assert.equal(loadPlan('broken', dates[3]).steps.length, 3);
assert.deepEqual(coach.loadAcademyCoachHistory('broken'), []);
data.set(coach.academyCoachHistoryKey('broken'), JSON.stringify([{ week:'2026-99-99',completed:3,total:3 }, {week:'2026-11-16',completed:99,total:3}]));
assert.deepEqual(coach.loadAcademyCoachHistory('broken'), []);
// Keep only last twelve records, report always only the last eight weeks.
const many = Array.from({length:18}, (_,i) => ({week: coach.academyCoachWeek(new Date(2026, 0, 5+i*7,12)), completed:i%4,total:3}));
data.set(coach.academyCoachHistoryKey('many'), JSON.stringify(many));
assert.equal(coach.loadAcademyCoachHistory('many').length, 12);
const tsx = readFileSync(resolve(root, 'src/training/academy/TrainingAwenaAcademy.tsx'), 'utf8');
const css = readFileSync(resolve(root, 'src/training/academy/trainingAwenaAcademy.css'), 'utf8');
assert.equal(ts.transpileModule(tsx, { fileName:'TrainingAwenaAcademy.tsx', reportDiagnostics:true,
  compilerOptions:{ target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX } }).diagnostics.filter(d => d.category===ts.DiagnosticCategory.Error).length, 0);
for (const token of ['getAcademyCoachReport', 'mssAcademyCoachReport', 'coachSummary', 'FinishDoWeeklyPanel']) assert(tsx.includes(token), `UI manquante : ${token}`);
for (const token of ['.mssAcademyCoachReport', '.mssAcademyCoachReportWeeks', '@media(max-width:450px)']) assert(css.includes(token), `CSS manquante : ${token}`);
const count = catalogue.reduce((total, item) => total + getAcademyQuestions(item).length, 0);
assert(catalogue.length >= 50 && count >= 146);
console.log(`PASS V244 Coach : ${catalogue.length} leçons, ${count} questions, report 8 semaines, 12 archives max, stockage local par profil, rollover, séries, bilans et TSX`);
