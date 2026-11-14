/**
 * V146 — SHOVE history exports must survive a compact History V4 JSON transfer.
 * No external NAS/Cloud/device is accessed: this tests the transferable report
 * data contract and prevents empty stats after stateSnapshot removal.
 */
import assert from 'node:assert/strict';
import { enrichShoveHistoryReport, isShoveHistoryEntry } from '../src/lib/shoveAPennyHistoryReport.ts';

const blank = () => ({ title: '', rounds: 0, date: '', unit: '', highlight: [], players: [], details: [] });
const sectors = (values, from = 1, to = 9) => Object.fromEntries(
  Array.from({length: to - from + 1}, (_,i)=>[String(from+i), values[from+i] || 0]),
);

// Same name is deliberate: history must never collapse two distinct profiles.
const compact = {
  id: 'wave61-shove-v146', mode: 'shove_a_penny', sport: 'darts',
  status: 'finished', winnerId: 'bot-2',
  summary: {
    modeId: 'shove_a_penny',
    config: { modeOptions: { ruleSet: 'traditional', endMode: 'fixed_rounds', marksPerBox: 3 } },
    // Modern buildRecord saves an OBJECT keyed by stable IDs, NOT an array.
    playerStats: {
      'user-1': { id:'user-1', name: 'Ninja', rank: 2, darts: 12, hits: 8,
        misses: 4, doubles: 1, triples: 0, visits: 4,
        shoveAPenny: { marksBySector: sectors({1:1,2:1,3:1}) } },
      'bot-2': { id:'bot-2', name: 'Ninja', rank: 1, darts: 9, hits: 7,
        misses: 2, doubles: 2, triples: 1, visits: 3,
        shoveAPenny: { marksBySector: sectors({1:3,2:3,3:3,4:2}) } },
    },
  },
};
const transferred = JSON.parse(JSON.stringify(compact));
assert.equal(isShoveHistoryEntry(transferred), true);
let report = enrichShoveHistoryReport(blank(), transferred);
assert.deepEqual(report.players.map(p=>p.participantId), ['bot-2','user-1'],
  'ranking survives compact History V4 transfer without a stateSnapshot or player list');
assert.deepEqual(report.players.map(p=>p.name), ['Ninja','Ninja'],
  'duplicate display names remain separate stable participant IDs');
assert.deepEqual(report.players.map(p=>p.score), [3,0],
  'only full 3/3 sectors are closed, not 1/3 or 2/3');
assert.equal(report.players[0].darts, 9);
assert.equal(report.players[1].darts, 12);
assert.equal(report.players[0].accuracy, 77.8);
assert.equal(report.players[1].accuracy, 66.7);
assert.ok(report.players[0].metrics.find(m=>m.label==='MISS' && m.value==='2'));
assert.ok(report.details.find(x=>x.title.includes('CLASSEMENT FINAL')).rows[0][0].includes('Ninja'));
assert.equal(report.configSummary.find(x=>x.label==='FIN DE PARTIE').value, 'Rounds limités');

// Old snapshots with playerStats as an array must still export properly.
const legacy = structuredClone(compact);
legacy.players = [{id:'bot-2',name:'Ninja'}, {id:'user-1',name:'Ninja'}];
legacy.summary.playerStats = Object.values(legacy.summary.playerStats);
report = enrichShoveHistoryReport(blank(), JSON.parse(JSON.stringify(legacy)));
assert.equal(report.players[0].darts,9);
assert.equal(report.players[1].score,0);

// The 2-mark electronic variant is valid and its table note must not claim 3/3.
const electronic = structuredClone(compact);
electronic.summary.config.modeOptions = {ruleSet:'electronic',endMode:'first_finish',marksPerBox:2};
electronic.summary.playerStats['user-1'].shoveAPenny.marksBySector = {'15':2,'16':1,'17':0,'18':0,'19':0,'20':0,'25':0};
electronic.summary.playerStats['bot-2'].shoveAPenny.marksBySector = {'15':2,'16':2,'17':2,'18':2,'19':2,'20':2,'25':2};
report = enrichShoveHistoryReport(blank(), JSON.parse(JSON.stringify(electronic)));
assert.equal(report.players[0].scoreDisplay, '7/7 CASES');
assert.equal(report.players[1].scoreDisplay, '1/7 CASES');
assert.match(report.details.find(s=>s.title.includes('TABLEAU DES MARQUES')).note, /2\/2 signifie fermée/);
assert.equal(report.details.find(s=>s.title.includes('TABLEAU DES MARQUES')).rows.at(-1)[0], 'BULL');

// Genuine missing data must NOT be replaced by invented marks or precision.
const missing = structuredClone(compact);
delete missing.summary.playerStats['user-1'].shoveAPenny;
delete missing.summary.playerStats['user-1'].darts;
delete missing.summary.playerStats['user-1'].hits;
report = enrichShoveHistoryReport(blank(), JSON.parse(JSON.stringify(missing)));
assert.equal(report.players[1].scoreDisplay, 'CASES —');
assert.equal(report.players[1].darts, null);
assert.equal(report.players[1].accuracy, null);

console.log('✅ SHOVE V146 : compact History V4 JSON, ranks, duplicate names, marks, stats, 2/2 and no invented data.');
