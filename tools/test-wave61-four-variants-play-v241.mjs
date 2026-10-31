import fs from 'node:fs';
const play=fs.readFileSync(new URL('../src/pages/Wave61SharedPlay.tsx', import.meta.url),'utf8');
const engine=fs.readFileSync(new URL('../src/lib/gameEngines/wave61Engine.ts', import.meta.url),'utf8');
const end=fs.readFileSync(new URL('../src/pages/wave61/Wave61EndSummary.tsx', import.meta.url),'utf8');
for(const id of ['green_vs_red','black_vs_white','three_colors','la_suite','color_call']) if(!play.includes(`id === "${id}"`) && !play.includes(`spec.id === "${id}"`)) throw new Error(`play missing ${id}`);
for(const token of ['SUIVI DE PERFORMANCE','data-variant-performance','data-three-colors-active-player','data-four-variants-active-player','data-la-suite-keypad','data-color-call-keypad','LaSuitePanel','ColorCallPanel','SequenceInput','ColorCallInput']) if(!play.includes(token)) throw new Error(`play missing ${token}`);
for(const token of ['laSuiteValidVisitsByPlayer','laSuiteInvalidVisitsByPlayer','laSuiteBestVisitByPlayer','laSuiteLongestStreakByPlayer','colorCallHitsByPlayer','colorCallDartsByPlayer','colorCallPerfectVisitsByPlayer','colorCallBestVisitByPlayer','colorCallHitsByColorByPlayer']) if(!engine.includes(token)) throw new Error(`engine missing ${token}`);
for(const token of ['data-la-suite-final-table="1"','data-color-call-final-table="1"','LA SUITE · TABLEAU FINAL','COLOR CALL · TABLEAU FINAL']) if(!end.includes(token)) throw new Error(`end missing ${token}`);
console.log('✅ V241 — structure Play GVR harmonisée sur BLACK/WHITE, 3 COULEURS, LA SUITE et COLOR CALL + suivi performance + keypads + finales.');
