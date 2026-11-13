/** Long-run baseline + per-visit form (good, average, bad) regressions. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const previousTsHook = Module._extensions['.ts'];
Module._extensions['.ts'] = (mod, filename) => {
  const out = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  mod._compile(out, filename);
};
const { shoveBotChance, rollShoveBotVisitForm, rollShoveBotDart } = require('../src/lib/gameEngines/shoveBotAccuracy.ts');
const { createWave61State, pickWave61BotDarts } = require('../src/lib/gameEngines/wave61Engine.ts');
let seed = 0x97ac1e4;
const rng = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
const originalRandom = Math.random;
Math.random = rng;
try {
  const baselines = [0.36, 0.45, 0.55, 0.65, 0.75];
  const perStars = [];
  for (let stars=1; stars<=5; stars++) {
    let sum = 0, cold=0, hot=0, allHits=0, noHits=0, avgHits=0;
    const formRates = [];
    for (let visit=0; visit<10000; visit++) {
      // One randomly sampled 'good day / bad day' skill level for all three arrows.
      const form = rollShoveBotVisitForm(stars, rng);
      sum += form.sectorHit;
      formRates.push(form.sectorHit);
      if (form.sectorHit < baselines[stars-1] - 0.1) cold++;
      if (form.sectorHit > baselines[stars-1] + 0.1) hot++;
      let hits = 0;
      for (let dart=0; dart<3; dart++) {
        const roll = rollShoveBotDart(2, stars, 3, rng, form);
        if (roll.number === 2) hits++;
      }
      if (hits === 0) noHits++;
      if (hits === 3) allHits++;
      avgHits += hits;
    }
    const mean = sum / 10000;
    const rate = avgHits / 30000;
    assert.ok(Math.abs(mean - baselines[stars-1]) < 0.006,
      `stars=${stars}: mean form ${mean} differs too far from ${baselines[stars-1]}`);
    assert.ok(Math.abs(rate - baselines[stars-1]) < 0.016,
      `stars=${stars}: long-run actual hit rate ${rate} differs too far from baseline`);
    assert.ok(cold > 2000 && hot > 2000, `stars=${stars}: visit-to-visit fluctuations missing (${cold},${hot})`);
    assert.ok(noHits > 5 && allHits > 5, `stars=${stars}: occasional great/bad visits impossible (${allHits},${noHits})`);
    perStars.push({ stars, meanPct: +(mean*100).toFixed(1), coldVisits: cold,
      hotVisits: hot, noHitVisits: noHits, perfectSectorVisits: allHits,
      minFormPct: +(Math.min(...formRates)*100).toFixed(1), maxFormPct: +(Math.max(...formRates)*100).toFixed(1) });
  }
  // An inspired 3★ bot can have a stronger single visit than a tired 5★ bot.
  let upsets = 0;
  for (let i=0; i<5000; i++) {
    if (rollShoveBotVisitForm(3, rng).sectorHit > rollShoveBotVisitForm(5, rng).sectorHit) upsets++;
  }
  assert.ok(upsets > 100 && upsets < 1700, `3★ vs 5★ cross-over looks unrealistic: ${upsets}/5000`);
  let inspiredThreeStarWinsVisit = 0;
  for (let i=0; i<5000; i++) {
    const form3 = rollShoveBotVisitForm(3, rng);
    const form5 = rollShoveBotVisitForm(5, rng);
    let h3 = 0, h5 = 0;
    for (let j=0; j<3; j++) {
      if (rollShoveBotDart(1, 3, 3, rng, form3).number === 1) h3++;
      if (rollShoveBotDart(1, 5, 3, rng, form5).number === 1) h5++;
    }
    if (h3 > h5) inspiredThreeStarWinsVisit++;
  }
  assert.ok(inspiredThreeStarWinsVisit > 150,
    `A 3★ bot should sometimes have more aimed hits than a 5★ bot over three darts: ${inspiredThreeStarWinsVisit}`);
  // Test actual engine invocations: selecting a bot 5★ is NOT 3 automatic triples.
  const players = [{ id:'elite', name:'Elite', isBot:true, stars:5 }, {id:'other',name:'Other'}];
  const game = createWave61State(players, 'shove_a_penny', {selectedIds:['elite','other'],
    botIds:['elite'], rounds:60, modeOptions:{ruleSet:'traditional', marksPerBox:3, endMode:'first_finish'}});
  const visitPatterns = new Set();
  let triples=0, misses=0, wrong=0;
  for (let i=0; i<300; i++) {
    const darts = pickWave61BotDarts(game, 'hard', 5);
    assert.equal(darts.length,3);
    visitPatterns.add(darts.map(d=>`${d.bed}${d.number ?? ''}`).join(','));
    triples += darts.filter(d=>d.bed==='T').length;
    misses += darts.filter(d=>d.bed==='MISS').length;
    wrong += darts.filter(d=>d.number && d.number !== 1 && d.bed !== 'MISS').length;
  }
  assert.ok(visitPatterns.size > 45 && triples > 10 && misses > 10 && wrong > 10,
    `engine bot appears predictable: patterns=${visitPatterns.size}, T=${triples}, MISS=${misses}, wrong=${wrong}`);
  assert.ok(triples < 300, '5★ still generated too many automatic triples');
  console.table(perStars);
  console.log(`3★ was in better form than 5★ in ${upsets}/5000 visits; made more hits in ${inspiredThreeStarWinsVisit}/5000 three-dart visits.`);
  console.log(`Real engine 5★: ${visitPatterns.size} distinct visit patterns among 300 visits.`);
  console.log('✅ V129 fluctuating hot/cold bot form: long-run stars preserved, bad/good rounds, individual dart variety.');
} finally {
  Math.random = originalRandom;
  if (previousTsHook) Module._extensions['.ts'] = previousTsHook;
  else delete Module._extensions['.ts'];
}
