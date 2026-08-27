import fs from 'node:fs';

const module = fs.readFileSync(new URL('../src/pages/running/RunningModule.tsx', import.meta.url), 'utf8');
const scout = fs.readFileSync(new URL('../src/pages/running/OutdoorRouteScoutDiscover.tsx', import.meta.url), 'utf8');
const detail = fs.existsSync(new URL('../src/pages/running/OutdoorRouteDetailPage.tsx', import.meta.url)) ? fs.readFileSync(new URL('../src/pages/running/OutdoorRouteDetailPage.tsx', import.meta.url), 'utf8') : '';

const checks = [
  ['map/cards view switch', scout.includes('type ViewMode = "map" | "cards"') && scout.includes('setViewMode("map")') && scout.includes('setViewMode("cards")')],
  ['search controls collapse', scout.includes('searchOpen') && scout.includes('setSearchOpen')],
  ['filters collapse', scout.includes('filtersOpen') && scout.includes('setFiltersOpen')],
  ['selected route strip', scout.includes('SelectedRouteStrip')],
  ['responsive route card grid', scout.includes('repeat(auto-fit,minmax(min(100%,270px),1fr))')],
  ['large map visual hierarchy', scout.includes('aspectRatio: "4/3"') && scout.includes('minHeight: 300')],
  ['compact scout header', scout.includes('SCOUT PARCOURS') && scout.includes('Les réglages restent cachés')],
  ['compact route mode navigation', module.includes("['scout','✦'") && module.includes('flex: active ? "1 0 auto" : "0 0 36px"')],
  ['immersive selected route map', module.includes('zoomable immersive route={selectedRoute}') && module.includes('immersive?: boolean')],
  ['compact route detail navigation', (module.includes("['details','▤'") && module.includes("['photos','▧'")) || (detail.includes('["overview", "▤"') && detail.includes('["photos", "▧"'))],
  ['map overlay simplified to three metrics', module.includes('gridTemplateColumns: "repeat(3,minmax(0,1fr))"') && (module.includes('VOIR LA FICHE') || module.includes('FICHE COMPLÈTE'))],
  ['route list hidden by default', module.includes('useState(false)') && module.includes('setRouteListOpen')],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exit(1);
