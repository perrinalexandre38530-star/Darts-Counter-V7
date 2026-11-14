import assert from 'node:assert/strict';
import fs from 'node:fs';
import { enrichShoveHistoryReport, isShoveHistoryEntry } from '../src/lib/shoveAPennyHistoryReport.ts';

const blank = () => ({ title:'PARTIE', date:'',rounds:0,unit:'points',highlight:[],players:[],details:[] });
const players = [ {id:'p1',name:'Ninja'}, {id:'p2',name:'Ninja'} ]; // duplicated names must NOT merge accounts
const visits = [
  {playerId:'p1',round:1,darts:[{bed:'S',number:1},{bed:'S',number:2},{bed:'MISS'}], delta:2},
  {playerId:'p2',round:1,darts:[{bed:'T',number:1},{bed:'T',number:2},{bed:'T',number:3}],delta:9},
];
const marksByPlayer = {p1: {'1':1,'2':1,'3':0,'4':0,'5':0,'6':0,'7':0,'8':0,'9':0},
  p2: {'1':3,'2':3,'3':3,'4':0,'5':0,'6':0,'7':0,'8':0,'9':0}};
const entry = {
  modeId:'shove_a_penny', status:'in_progress',players,
  summary:{modeId:'shove_a_penny',winnerId:null,rankings:[{id:'p2',name:'Ninja',rank:1},{id:'p1',name:'Ninja',rank:2}],
    config:{modeOptions:{ruleSet:'traditional',marksPerBox:3,endMode:'full_ranking'}},
    shoveAPenny:{ruleSet:'traditional',marksPerBox:3,endMode:'full_ranking',marksByPlayer,finishOrder:[]}},
  payload:{visits,stateSnapshot:{modeId:'shove_a_penny',phase:'playing',players,config:{modeOptions:{ruleSet:'traditional',marksPerBox:3,endMode:'full_ranking'}},
    statsByPlayer:{p1:{darts:3,hits:2,misses:1,visits:1},p2:{darts:3,hits:3,triples:3,visits:1}},
    special:{shoveMarksByPlayer:marksByPlayer}}},
};
assert.equal(isShoveHistoryEntry(entry),true);
let report = enrichShoveHistoryReport(blank(),entry);
assert.equal(report.title,'SHOVE A PENNY · 1–9');
assert.equal(report.players.length,2,'same displayed names are separate IDs');
assert.equal(report.players[0].participantId,'p2');
assert.equal(report.players[0].score,3);
assert.equal(report.players[1].score,0,'two partial hits do not close a case');
assert.equal(report.players[1].scoreDisplay,'0/9 CASES');
assert.equal(report.players[1].scoreSecondary.startsWith('2/27 marques'),true);
assert.equal(report.players[0].darts,3);
assert.equal(report.players[0].scoreDisplay,'3/9 CASES');
assert.equal(report.details.find(s=>s.title.includes('TABLEAU DES MARQUES')).rows.length,9);
assert.equal(report.details.find(s=>s.title.includes('JOURNAL DES VOLÉES')).rows.length,2);
assert.equal(report.details.find(s=>s.title.includes('CLASSEMENT PROVISOIRE')).rows[0][0],'#1 Ninja');
assert.equal(report.configSummary.find(m=>m.label==='FIN DE PARTIE').value,'Classement complet');
assert.equal(report.unit,'volées');
assert.equal(report.rounds,1);

const electronicEntry=structuredClone(entry);
electronicEntry.status='finished';
electronicEntry.summary.winnerId='p1';
electronicEntry.summary.shoveAPenny={ruleSet:'electronic',marksPerBox:3,endMode:'first_finish',finishOrder:['p1'],
 marksByPlayer:{p1:{'15':3,'16':3,'17':3,'18':3,'19':3,'20':3,'25':3},p2:{'15':1,'16':0,'17':0,'18':0,'19':0,'20':0,'25':0}}};
electronicEntry.summary.rankings=[{id:'p1',rank:1},{id:'p2',rank:2}];
electronicEntry.payload.stateSnapshot.phase='finished';
report=enrichShoveHistoryReport(blank(),electronicEntry);
assert.equal(report.players[0].score,7);
assert.equal(report.players[1].score,0);
assert.equal(report.players[0].scoreDisplay,'7/7 CASES');
assert.equal(report.details.find(s=>s.title.includes('TABLEAU DES MARQUES')).rows.at(-1)[0],'BULL');
assert.match(report.configSummary.find(m=>m.label==='VARIANTE').value,/15 À 20/);
assert.ok(report.details.some(s=>s.title.includes('CLASSEMENT FINAL')));

// Historical archive with no known per-sector map: never invent numeric closures.
const legacy=structuredClone(entry);
delete legacy.summary.shoveAPenny;
delete legacy.payload.stateSnapshot.special;
legacy.summary.rankings=[{id:'p1',rank:1},{id:'p2',rank:2}];
report=enrichShoveHistoryReport(blank(),legacy);
assert.ok(Number.isNaN(report.players[0].score),'unknown total stays unknown');
assert.equal(report.players[0].scoreDisplay,'CASES —');
assert.equal(report.details.find(s=>s.title.includes('TABLEAU DES MARQUES')).rows[0][1],'—');

const other= {modeId:'cricket'};
assert.equal(isShoveHistoryEntry(other),false);
const raw=blank();
assert.equal(enrichShoveHistoryReport(raw,other),raw,'other games are untouched');
const historySrc=fs.readFileSync(new URL('../src/lib/challengeResultsExport.ts',import.meta.url),'utf8');
assert.match(historySrc,/if\(mode === 'shove_a_penny'\) return enrichShoveHistoryReport\(report, entry\)/);
console.log('✅ SHOVE History V136: historical variants, partial/closed marks, chronology, ranking, no fictional points.');
