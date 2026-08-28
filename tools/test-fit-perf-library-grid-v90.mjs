import fs from 'node:fs';
const plan = fs.readFileSync(new URL('../src/pages/fit/FitPerfPlan.tsx', import.meta.url), 'utf8');
const ui = fs.readFileSync(new URL('../src/pages/fit/FitPerfUi.tsx', import.meta.url), 'utf8');
const checks = [
  ['9 per page constant', plan.includes('const EXERCISES_PER_PAGE = 9;')],
  ['3 column grid', plan.includes('gridTemplateColumns: "repeat(3,minmax(0,1fr))"')],
  ['filter drawer exists', plan.includes('setFiltersOpen(true)') && plan.includes('role="dialog"')],
  ['three filter tabs', plan.includes('["zone", t("Zone"') && plan.includes('["equipment", t("Matériel"') && plan.includes('["level", t("Niveau"')],
  ['old inline filter headings removed', !plan.includes('NIVEAU · MOUVEMENT · OBJECTIF') && !plan.includes('<div style={{ marginTop: 7, color: textSoft, fontSize: 6.8, fontWeight: 1000, letterSpacing: .7 }}>{t("ZONE"')],
  ['active filter strip', plan.includes('FILTRES ACTIFS') && plan.includes('filterSelections')],
  ['pagination wraps', plan.includes('(current - 1 + pageCount) % pageCount') && plan.includes('(current + 1) % pageCount')],
  ['first and last page buttons', plan.includes('setPage(0)') && plan.includes('setPage(pageCount - 1)')],
  ['photo or video media', plan.includes('premium?.video?.sources?.[0]?.src') && plan.includes('freeExerciseImageUrl(exercise)')],
  ['filter icon', ui.includes('\"filter\"') && ui.includes('case \"filter\"')],
];
let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'OK' : 'FAIL'} ${label}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
