import fs from 'node:fs';

function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const play = read('src/pages/Wave61SharedPlay.tsx');

for (const token of [
  'useViewport',
  'isLandscapeTablet',
  'data-wave61-landscape="three-zone"',
  'data-wave61-play-grid="three-zone"',
  'data-wave61-zone="players"',
  'data-wave61-zone="mission"',
  'data-wave61-zone="input"',
  'data-wave61-player-list="scroll"',
  'renderModeSpecificPanel()',
  'fitMinScale={compactHeight ? 0.28 : 0.34}',
]) assert(play.includes(token), `Wave61 paysage: ${token} absent`);

assert(play.includes('if (isLandscapeTablet) {'), 'Branche paysage tablette absente');
assert(play.includes('return <div style={{ minHeight: "calc(var(--vh,1vh) * 100)"'), 'Branche portrait historique absente');
assert(play.includes('overflow: "hidden", display: "grid"'), 'Grille paysage sans verrouillage du scroll global');
assert(play.includes('overflowY: "auto"'), 'Scroll interne des zones paysage absent');

console.log('✅ Wave61 V22 — responsive paysage / tablette / TV');
console.log('✅ 3 zones : joueurs / mission / saisie');
console.log('✅ scroll interne + keypad plein panneau + portrait conservé');
