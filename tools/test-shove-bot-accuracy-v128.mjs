/** Real-engine and statistical regressions for SHOVE AI (1–5 stars). */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const previousTsHook = Module._extensions['.ts'];
Module._extensions['.ts'] = (module, filename) => {
  const javascript = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  module._compile(javascript, filename);
};
const { shoveBotChance, rollShoveBotDart } = require('../src/lib/gameEngines/shoveBotAccuracy.ts');
const { createWave61State, playWave61Visit, pickWave61BotDarts } = require('../src/lib/gameEngines/wave61Engine.ts');
const { resolveBotStars } = require('../src/lib/botSkillLevel.ts');

const players = [
  { id: 'pro', name: 'Cool Hand', botLevel: 'legend', stars: 5, isBot: true },
  { id: 'rookie', name: 'Rookie', botLevel: 'easy', stars: 1, isBot: true },
];
const make = (modeOptions = {}) => createWave61State(players, 'shove_a_penny', {
  selectedIds: players.map((p) => p.id),
  botIds: players.map((p) => p.id),
  rounds: 60,
  modeOptions: { ruleSet: 'traditional', marksPerBox: 3, endMode: 'first_finish', ...modeOptions },
});

const newTargets = [0.36, 0.45, 0.55, 0.65, 0.75];
for (let i = 0; i < newTargets.length; i++) {
  assert.ok(Math.abs(shoveBotChance(i + 1).sectorHit - newTargets[i]) < 1e-9,
    `${i + 1} star hit rate must match the new calibration`);
}
assert.ok(Math.abs(shoveBotChance(4.5).sectorHit - 0.70) < 1e-9);
assert.ok(Math.abs(shoveBotChance(1.5).sectorHit - 0.405) < 1e-9);
assert.equal(shoveBotChance(0).sectorHit, 0.55, 'legacy/no stars fallback to moderate skill');
assert.equal(resolveBotStars({ botLevel: 'legend' }), 5);
assert.equal(resolveBotStars({ stars: 2.5 }), 2.5);
assert.equal(resolveBotStars({ level: 'pro' }), 4.5);

const originalRandom = Math.random;
let seed = 0x12345678;
Math.random = () => {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) / 4294967296;
};

try {
  const profile = {};
  for (const stars of [1, 2, 3, 4, 5]) {
    const count = 8000;
    const total = { hit: 0, triples: 0, doubles: 0, singles: 0, miss: 0, wrongSector: 0 };
    for (let i = 0; i < count; i++) {
      const dart = rollShoveBotDart(1, stars, 3);
      if (dart.bed === 'MISS') total.miss++;
      else if (dart.number !== 1) total.wrongSector++;
      else {
        total.hit++;
        if (dart.bed === 'T') total.triples++;
        if (dart.bed === 'D') total.doubles++;
        if (dart.bed === 'S') total.singles++;
      }
    }
    const rate = total.hit / count;
    assert.ok(Math.abs(rate - shoveBotChance(stars).sectorHit) < 0.025, `stars=${stars}: wrong hit rate ${rate}`);
    assert.ok(total.miss > 0 && total.wrongSector > 0 && total.doubles > 0 && total.triples > 0 && total.singles > 0,
      `stars=${stars}: every dart category must be possible`);
    profile[stars] = { ...total, rate: Number((rate * 100).toFixed(1)) };
  }
  assert.ok(profile[5].rate > profile[4].rate && profile[4].rate > profile[3].rate && profile[3].rate > profile[2].rate && profile[2].rate > profile[1].rate,
    'increasing stars must improve hit probability');
  assert.ok(profile[5].triples < profile[5].hit * 0.38, 'even an elite bot cannot always triple');

  // Check the *real* Wave61 engine picks and their gameplay effects.
  let game = make();
  let totalDarts = 0, totalTriples = 0, totalMisses = 0, totalWrong = 0;
  const firstPlayerDarts = [];
  for (let i = 0; i < 300; i++) {
    const darts = pickWave61BotDarts(game, 'hard', 5);
    assert.equal(darts.length, 3);
    for (const d of darts) {
      totalDarts++;
      if (d.bed === 'T') totalTriples++;
      if (d.bed === 'MISS') totalMisses++;
      if (d.bed === 'S' && ![1,2,3,4,5,6,7,8,9].includes(d.number)) totalWrong++;
    }
    if (i === 0) firstPlayerDarts.push(...darts);
  }
  assert.ok(totalTriples < totalDarts * .4, `elite bots tripled too often: ${totalTriples}/${totalDarts}`);
  assert.ok(totalMisses > 0 && totalWrong > 0, 'elite bots still make different errors');
  const first = playWave61Visit(game, firstPlayerDarts);
  assert.equal(first.statsByPlayer.pro.darts, 3, 'bot impact accounting preserved');
  assert.equal(first.visits.length, 1, 'bot visit persisted');
  assert.ok(first.special.shoveMarksByPlayer.pro['1'] <= 3, 'original SHOVE marks are capped');

  // The electronic variant retains its sequential rule, and bull is no longer a forced hit.
  const electronic = make({ ruleSet: 'electronic' });
  for (const value of [15,16,17,18,19,20]) electronic.special.shoveMarksByPlayer.pro[String(value)] = 3;
  let missesOnBull = 0, bullHits = 0;
  for (let i=0; i<600; i++) {
    const d = pickWave61BotDarts(electronic, 'hard', 5)[0];
    if (d.bed === 'OB' || d.bed === 'IB') bullHits++; else missesOnBull++;
  }
  assert.ok(bullHits > 280 && missesOnBull > 100, `bull must be hit sometimes and missed sometimes: ${bullHits}, ${missesOnBull}`);

  // Full SHOVE sessions with a passive opponent: elite bots must not win in 3 automatic triple visits.
  const fullMatches = [];
  for (const stars of [1, 3, 5]) {
    let totalVisits = 0, totalAccuracy = 0;
    for (let gameNumber = 0; gameNumber < 80; gameNumber++) {
      let session = make({ overflowRule: 0 });
      let turns = 0;
      while (session.phase === 'playing' && turns < 300) {
        const isBotTurn = session.players[session.activePlayerIndex].id === 'pro';
        const visit = isBotTurn ? pickWave61BotDarts(session, 'hard', stars)
          : [{ bed: 'MISS' }, { bed: 'MISS' }, { bed: 'MISS' }];
        session = playWave61Visit(session, visit);
        turns++;
      }
      assert.equal(session.phase, 'finished', `star ${stars}: bot never finished the match`);
      assert.equal(session.winnerId, 'pro', `star ${stars}: wrong winner`);
      const stats = session.statsByPlayer.pro;
      totalVisits += stats.visits;
      totalAccuracy += stats.hits / Math.max(1, stats.darts);
    }
    fullMatches.push({ stars, avgVisits: Number((totalVisits/80).toFixed(1)), avgAccuracy: Number((totalAccuracy/80*100).toFixed(1)) });
  }
  assert.ok(fullMatches[2].avgVisits >= 4.5, `elite bot is still too perfect: ${fullMatches[2].avgVisits} visits`);
  assert.ok(fullMatches[2].avgAccuracy < 91, 'elite full-match accuracy should remain below 91% on average');
  assert.ok(fullMatches[0].avgVisits > fullMatches[2].avgVisits, 'a rookie should need more visits than an elite bot');
  console.log('Simulation of 80 completed matches per level:');
  console.table(fullMatches);

  console.log('✅ SHOVE bot stars V128: adjusted 36/45/55/65/75% curve, samples, engine, errors, bull and stats.');
  console.table(Object.entries(profile).map(([stars, row]) => ({
    stars,
    'aim hit %': row.rate,
    'singles %': Number((row.singles/80).toFixed(1)),
    'doubles %': Number((row.doubles/80).toFixed(1)),
    'triples %': Number((row.triples/80).toFixed(1)),
    'MISS %': Number((row.miss/80).toFixed(1)),
    'neighbour %': Number((row.wrongSector/80).toFixed(1)),
  })));
} finally {
  Math.random = originalRandom;
  if (previousTsHook) Module._extensions['.ts'] = previousTsHook;
  else delete Module._extensions['.ts'];
}
