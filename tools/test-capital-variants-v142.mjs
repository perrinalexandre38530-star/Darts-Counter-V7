import assert from 'node:assert/strict';
import {
  CAPITAL_GRID_PRESETS,
  CAPITAL_CONTRACT_META,
  CAPITAL_SELECTABLE_CONTRACTS,
  capitalContractSuccess,
  capitalVisitScore,
  applyCapitalVisit,
  normalizeCapitalDarts,
  capitalDartLabel,
  capitalExactScorePossible,
  makeCapitalBotVisit,
  buildCapitalPlayerStats,
} from '../src/lib/capitalGame.ts';

const S = (v, zone) => ({ v, mult: 1, ...(zone ? { zone } : {}) });
const D = (v) => ({ v, mult: 2 });
const T = (v) => ({ v, mult: 3 });
const MISS = { v: 0, mult: 1, zone: 'miss' };
const OUTSIDE = { v: 0, mult: 1, zone: 'outside' };
const eq = (id, hits, expected = true, options = {}) => assert.equal(capitalContractSuccess(id, hits, options), expected, `${id}: ${hits.map(capitalDartLabel).join(', ')}`);

assert.deepEqual(CAPITAL_GRID_PRESETS.clubs15.contracts, ['capital','n20','triple_any','n19','double_any','n18','side','n17','suite','n16','colors_3','n15','exact_57','n14','center']);
assert.deepEqual(CAPITAL_GRID_PRESETS.modern17.contracts, ['capital','n20','suite','n19','colors_3','n18','side','n17','exact_57','n16','peluche','n15','triple_any','n14','double_any','n13','center']);
assert.deepEqual(CAPITAL_GRID_PRESETS.bar17.contracts, ['capital','n20','colors_3','n19','suite','n18','triple_any','n17','exact_57','n16','double_any','n15','side','n14','diagonal','n13','center']);
for (const [id, grid] of Object.entries(CAPITAL_GRID_PRESETS)) {
  assert.equal(new Set(grid.contracts).size, grid.contracts.length, `${id}: duplicate contracts`);
  assert.equal(grid.contracts[0], 'capital');
  for (const contract of grid.contracts) assert.ok(CAPITAL_CONTRACT_META[contract], `${id}: missing contract ${contract}`);
}
for (const contract of CAPITAL_SELECTABLE_CONTRACTS) assert.ok(CAPITAL_CONTRACT_META[contract], `missing ${contract}`);
assert.equal(CAPITAL_SELECTABLE_CONTRACTS.length, 29);

// Classic regression
for (const id of ['n20','n19','n18','n17','n16','n15','n14','n13']) eq(id, [S(Number(id.slice(1))), MISS, MISS]);
eq('side',[S(20),S(1),S(18)]);
eq('side',[S(20),S(2),S(18)],false);
eq('suite',[S(16),S(14),S(15)]);
eq('suite',[S(16),S(14),S(14)],false);
eq('colors_3',[S(20),D(20),S(1)]);
eq('peluche',[S(7),S(6),S(6)]);
eq('peluche',[S(7),S(6),MISS],false);

// Diagonale : ordre essentiel, opposite secteur en face.
eq('diagonal',[S(20),S(25),S(3)]);
eq('diagonal',[S(20),D(25),S(3)]);
eq('diagonal',[S(3),S(25),S(20)]);
eq('diagonal',[S(20),S(25),S(1)],false);
eq('diagonal',[S(3),S(20),S(25)],false);
eq('shanghai',[S(12),T(12),D(12)]);
eq('shanghai',[S(12),D(13),T(12)],false);
eq('shanghai',[S(12),D(12),D(12)],false);
eq('even_3',[S(2),D(6),T(20)]);
eq('even_3',[S(2),S(3),T(20)],false);
eq('even_3',[S(2),S(25),T(20)],false);
eq('odd_3',[S(1),D(17),T(19)]);
eq('odd_3',[S(1),D(18),T(19)],false);
eq('exact_42',[S(20),S(20),S(2)]);
eq('exact_42',[S(20),S(20),S(3)],false);
eq('exact_69',[S(19),D(25),MISS]);
eq('exact_69',[S(19),S(25),MISS],false);
eq('exact_custom',[D(20),D(20),MISS],true,{exactTarget:80});
eq('exact_custom',[D(20),D(20),MISS],false,{exactTarget:90});
eq('packet',[S(12),S(12),S(12)]);
eq('packet',[D(12),D(12),D(12)],false);
eq('packet',[D(12),D(12),D(12)],true,{packetAllowMultipliers:true});
eq('packet',[S(12,'outer-single'),S(12,'inner-single'),S(12,'outer-single')],false);
eq('packet',[S(12),D(12),S(12)],false);
eq('four_corners',[S(20),D(3),T(11)]);
eq('four_corners',[S(20),S(1),T(11)],false);
eq('outer_single',[S(20,'outer-single'),S(19,'outer-single'),S(18,'outer-single')]);
eq('outer_single',[S(20,'outer-single'),S(19),S(18,'outer-single')],false);
eq('outer_single',[S(20,'outer-single'),D(19),S(18,'outer-single')],false);
eq('bad_hand',[S(4),S(5),S(6)],false);
eq('bad_hand',[S(4),S(5),S(6)],true,{manualValidated:true});
eq('bad_hand',[S(4),S(5),MISS],false,{manualValidated:true});
eq('poubelle',[OUTSIDE,OUTSIDE,OUTSIDE]);
eq('poubelle',[OUTSIDE,OUTSIDE,MISS],false);
eq('petit_score',[S(1),S(2),S(3)]);
eq('petit_score',[S(1),S(2),S(7)],false);
eq('petit_score',[S(1),S(2),MISS],false);

assert.equal(capitalVisitScore([OUTSIDE,OUTSIDE,OUTSIDE]),0);
assert.equal(capitalDartLabel(OUTSIDE),'HORS CIBLE');
assert.equal(capitalDartLabel(MISS),'MISS');
assert.equal(normalizeCapitalDarts([OUTSIDE,S(1)]).length,3);
assert.equal(normalizeCapitalDarts([OUTSIDE,S(1)])[0].zone,'outside');
assert.equal(applyCapitalVisit(100,'poubelle',[OUTSIDE,OUTSIDE,OUTSIDE]).scoreAfter,100);
assert.equal(applyCapitalVisit(101,'poubelle',[OUTSIDE,OUTSIDE,MISS]).scoreAfter,50);
assert.equal(applyCapitalVisit(101,'poubelle',[OUTSIDE,OUTSIDE,MISS],false).scoreAfter,101);
assert.equal(applyCapitalVisit(100,'shanghai',[S(12),D(12),T(12)],true,{shanghaiBonus:50}).scoreAfter,222);
assert.equal(applyCapitalVisit(100,'shanghai',[S(12),D(12),T(12)],true,{shanghaiBonus:50}).bonusPoints,50);
assert.equal(applyCapitalVisit(100,'shanghai',[S(12),D(12),T(11)],true,{shanghaiBonus:50}).bonusPoints,0);
assert.equal(applyCapitalVisit(100,'capital',[T(20),T(20),T(20)]).scoreAfter,180);
assert.equal(applyCapitalVisit(101,'diagonal',[S(20),S(25),S(3)]).scoreAfter,149);
assert.equal(applyCapitalVisit(101,'diagonal',[S(20),S(25),S(4)]).scoreAfter,50);
for (const target of [1,25,42,69,80,101,120,170,180]) assert.equal(capitalExactScorePossible(target),true,`exact ${target}`);
for (const contract of ['diagonal','shanghai','even_3','odd_3','packet','four_corners','outer_single','bad_hand','poubelle','petit_score','n13','exact_42','exact_69']) {
 const darts = makeCapitalBotVisit(contract,'hard','normal');
 assert.equal(darts.length,3,`bot ${contract}`);
 assert.ok(darts.every((dart) => Number.isInteger(dart.v)),`bot malformed ${contract}`);
}
const exactBot = makeCapitalBotVisit('exact_custom','hard','normal',{exactTarget:80});
assert.equal(exactBot.length,3);
const visits = [{id:'v1',contractId:'capital',contractIndex:0,playerId:'p',playerIndex:0,playerName:'J',darts:[S(20),S(20),S(20)],visitScore:60,success:true,scoreBefore:0,scoreAfter:60,delta:60,penaltyLost:0,createdAt:1},{id:'v2',contractId:'shanghai',contractIndex:1,playerId:'p',playerIndex:0,playerName:'J',darts:[S(12),D(12),T(12)],visitScore:72,bonusPoints:50,success:true,scoreBefore:60,scoreAfter:182,delta:122,penaltyLost:0,createdAt:2}];
const [stats] = buildCapitalPlayerStats([{id:'p',name:'J'}],visits,[182]);
assert.equal(stats.pointsWon,122);
assert.equal(stats.finalCapital,182);
console.log('CAPITAL VARIANTS V142: all regression assertions passed (3 grids, 29 selectable contracts, special zones, bonuses, stats, bots)');
