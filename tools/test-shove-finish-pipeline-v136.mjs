import assert from 'node:assert/strict';
import fs from 'node:fs';
import { enrichShoveHistoryReport } from '../src/lib/shoveAPennyHistoryReport.ts';

const read = path => fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const play=read('src/pages/Wave61SharedPlay.tsx');
const end=read('src/pages/newModes/newModePlayShared.tsx');
const exporter=read('src/components/ShoveFinalExportActions.tsx');
const history=read('src/lib/challengeResultsExport.ts');
const stats=read('src/pages/DartsModeSummaryPage.tsx');
assert.match(play,/record\.resume\.currentThrow = \[\]/, 'no stale validated throw in History resume');
assert.match(play,/\.then\(\(\) => History\.remove\(matchId\)\)/, 'first-visit undo deletes phantom history row');
assert.match(play,/matchIdRef\.current = `wave61-\$\{spec\.id\}-\$\{Date\.now\(\)\}/, 'new match id after a tombstone');
assert.match(play,/historyWriteQueueRef\.current = historyWriteQueueRef\.current/, 'write ordering is preserved');
assert.match(play,/setShoveHistorySaveError/, 'saving errors are visible');
assert.equal((play.match(/exportActions=\{spec\.id === "shove_a_penny"/g)||[]).length,3,'end export in portrait, landscape and fallback');
assert.match(end,/exportActions \? <div/, 'optional export actions do not alter other modes');
assert.match(exporter,/exportChallengeResults\(report,format\)/, 'PDF and PNG use the existing approved report renderer');
assert.match(exporter,/saveError \? <div/, 'failed History V4 write allows retry');
assert.match(history,/if\(mode === 'shove_a_penny'\) return enrichShoveHistoryReport\(report, entry\)/);
assert.match(stats,/wave61ModeId === "shove_a_penny" \? "Cases fermées"/);

// A many-player report must never squash all 10 competitors into one tiny PDF table.
const people=Array.from({length:10},(_,i)=>({id:'id-'+i,name:'Joueur '+(i+1)}));
const marksByPlayer=Object.fromEntries(people.map((p,i)=>[p.id,Object.fromEntries(Array.from({length:9},(_,j)=>[String(j+1),i<3?3:j===0?1:0]))]));
const report=enrichShoveHistoryReport({title:'',date:'',rounds:0,unit:'',highlight:[],players:[],details:[]}, {
  game:{modeId:'shove_a_penny'},status:'finished',players:people,
  summary:{modeId:'shove_a_penny',shoveAPenny:{ruleSet:'traditional',marksPerBox:3,finishOrder:people.slice(0,3).map(p=>p.id),marksByPlayer}},
});
assert.equal(report.players.length,10);
const marksTables=report.details.filter(p=>p.title.includes('TABLEAU DES MARQUES'));
assert.equal(marksTables.length,3);
assert.ok(marksTables.every(t=>t.columns.length<=5),'maximum four players per printable table');
assert.equal(marksTables[0].rows[0][1],'3/3');
assert.equal(marksTables.at(-1).rows[0].length,3);
console.log('✅ SHOVE V136: end export, first-undo, History V4, 10-player reports and stats integration.');
