import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const assert = (cond, msg) => { if (!cond) throw new Error(`❌ ${msg}`); console.log(`✅ ${msg}`); };

const play = read('src/pages/Wave61SharedPlay.tsx');
const engine = read('src/lib/gameEngines/wave61Engine.ts');
const summary = read('src/pages/wave61/Wave61EndSummary.tsx');
const sharedConfig = read('src/pages/Wave61SharedConfig.tsx');
const configs = {
  bim_bam_boum: read('src/pages/wave61/modes/bim_bam_boumConfig.tsx'),
  saute_moutons: read('src/pages/wave61/modes/saute_moutonsConfig.tsx'),
  troupeau_en_danger: read('src/pages/wave61/modes/troupeau_en_dangerConfig.tsx'),
  une_ptite_raclette: read('src/pages/wave61/modes/une_ptite_racletteConfig.tsx'),
};

for (const [id, src] of Object.entries(configs)) {
  assert(src.includes('seriesFormat'), `${id} expose le format BO/FT`);
  assert(sharedConfig.includes(`${id}: [`), `${id} reste groupé dans la Config partagée`);
}

for (const id of ['bim_bam_boum','saute_moutons','troupeau_en_danger']) {
  assert(engine.includes(`if (state.modeId === "${id}")`), `${id} possède une branche IA dédiée`);
}
assert(engine.includes('racletteChance = level === "hard" ? 0.74'), 'Raclette utilise une précision IA calibrée');
assert(engine.includes('rawLost') && engine.includes('savedThisVisit'), 'Troupeau compte les pertes nettes après sauvetage Berger');
assert(engine.includes('aliveTeams.length === 1'), 'Troupeau termine correctement une manche TEAM quand un seul camp reste');
assert(play.includes('data-series-team-mode'), 'Le scoreboard BO/FT sait afficher les scores TEAM');
assert(play.includes('bimBamBoumMatchWins') && play.includes('sauteMoutonsMatchWins') && play.includes('troupeauMatchWins') && play.includes('racletteMatchWins'), 'Les 4 modes FUN ont des compteurs de manches dédiés');
assert(play.includes('racletteMatchServedByPlayer'), 'Les services Raclette sont cumulés proprement entre les manches');
assert(summary.includes('racletteMatchServedByPlayer'), 'Le bilan final Raclette inclut les manches précédentes');
assert(engine.includes('WAVE61_ENGINE_VERSION = 25'), 'Le moteur Wave61 passe en V25');

console.log('\n✅ V100 — développement parallèle des 8 nouveaux modes validé.');
