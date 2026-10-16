import fs from 'node:fs';

function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const play = read('src/pages/Wave61SharedPlay.tsx');
const end = read('src/pages/wave61/Wave61EndSummary.tsx');
const fable = read('src/pages/wave61/Wave61FablePartyPanels.tsx');
const catalog = read('src/games/dartsWave61.ts');

const ids = [...catalog.matchAll(/\{ id: "([^"]+)"/g)].map((m) => m[1]);
assert(ids.length === 65, `65 modes attendus, trouvé ${ids.length}`);
assert(new Set(ids).size === 65, 'IDs Wave61 dupliqués');

for (const token of ['CorbeauRenardPanel', 'DartsImpossiblePanel', 'spec.id === "corbeau_renard"', 'spec.id === "darts_impossible"']) {
  assert(play.includes(token), `V94/V95 non intégré dans le Play actif: ${token}`);
}
for (const token of ['CORBEAU & RENARD', 'DARTS IMPOSSIBLE · INFILTRATION']) {
  assert(fable.includes(token), `Panneau final manquant: ${token}`);
}
for (const token of ['buildWave61Awards', 'RÉCOMPENSES DU MATCH', 'DÉTAILS JOUEURS · OBJECTIF DU MODE', 'DOUBLES', 'TRIPLES', 'BEST COMBO', 'metricText(row)', 'row.metric?.sub']) {
  assert(end.includes(token), `Fin de partie V96 incomplète: ${token}`);
}
for (const token of ['Wave61EndSummary', 'onStats={() => go?.("darts_mode_summary"', 'onHistory={() => go?.("statsHub"']) {
  assert(play.includes(token), `Navigation fin de partie absente: ${token}`);
}

console.log('✅ Wave61 V96 — V94/V95 présents dans le Play actif');
console.log('✅ 65 modes conservés');
console.log('✅ Fin de partie enrichie: récompenses + métrique spécifique + détail mode + S/D/T/Bull');
