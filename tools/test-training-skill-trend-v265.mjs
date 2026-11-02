import fs from 'node:fs';

const config = fs.readFileSync(new URL('../src/training/modes/lab/TrainingLabConfig.tsx', import.meta.url), 'utf8');
const trend = fs.readFileSync(new URL('../src/training/profile/trainingSkillTrend.ts', import.meta.url), 'utf8');
const checks = [
  ['builder exported', trend.includes('export function buildTrainingSkillTrend')],
  ['14-day current window', trend.includes('14 * DAY_MS')],
  ['28-day comparison window', trend.includes('28 * DAY_MS')],
  ['all six training families covered', ['scoring','doubles','checkout','precision','bull','regularity'].every((x) => trend.includes(`"${x}"`))],
  ['priority family calculated', trend.includes('priorityFamily') && trend.includes('priorityScore')],
  ['skill trend wired in config', config.includes('buildTrainingSkillTrend') && config.includes('TENDANCE COMPÉTENCES · 14 JOURS')],
  ['status labels rendered', ['EN PROGRÈS','À RELANCER','À DÉCOUVRIR','STABLE'].every((x) => config.includes(x))],
];
let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? '✅' : '❌'} ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log('\n✅ TRAINING SKILL TREND V265 GUARD OK');
