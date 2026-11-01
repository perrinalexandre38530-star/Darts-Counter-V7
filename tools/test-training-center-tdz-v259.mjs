import fs from 'node:fs';
const file = new URL('../src/training/modes/lab/TrainingLabConfig.tsx', import.meta.url);
const src = fs.readFileSync(file, 'utf8');
const required = [
  'function prepareRecommendedSession(',
  'function resumeProgramDraft()',
  'function runQuickStart()',
];
for (const token of required) {
  if (!src.includes(token)) throw new Error(`Training Center TDZ guard: missing hoisted helper ${token}`);
}
if (/const\s+(prepareRecommendedSession|resumeProgramDraft|runQuickStart)\s*=/.test(src)) {
  throw new Error('Training Center TDZ guard: quick-start helpers must stay hoisted function declarations.');
}
console.log('Training Center TDZ guard V259: OK');
