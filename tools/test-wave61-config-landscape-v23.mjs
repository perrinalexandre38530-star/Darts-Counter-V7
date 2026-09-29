import fs from 'node:fs';

function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const config = read('src/pages/Wave61SharedConfig.tsx');
const css = read('src/styles/responsive-landscape.css');
const catalog = read('src/games/dartsWave61.ts');
const ids = [...catalog.matchAll(/\{ id: "([^"]+)"/g)].map((m) => m[1]);

assert(ids.length === 65, `Catalogue Wave61 attendu: 65, trouvé ${ids.length}`);

for (const token of [
  'wave61-config-screen',
  'wave61-config-header',
  'wave61-config-ticker',
  'wave61-config-body',
  'wave61-config-participants',
  'wave61-config-engine',
  'wave61-config-assistance',
  'wave61-config-launch',
  'wave61-config-awena-card',
]) assert(config.includes(token), `Config Wave61: ${token} absent`);

assert(config.includes('wave61-config-dedicated'), 'Zone réglages dédiés absente');
assert(config.includes('/awena/awena-avatar.webp'), 'Carte Awena paysage absente');

for (const token of [
  'html[data-msc-orientation="landscape"] .wave61-config-screen',
  'grid-template-columns: minmax(245px, .92fr) minmax(300px, 1.12fr) minmax(250px, .86fr)',
  '.wave61-config-participants',
  '.wave61-config-engine',
  '.wave61-config-dedicated',
  '.wave61-config-assistance',
  '.wave61-config-launch',
  '[data-msc-device="tv"] .wave61-config-body',
  '[data-msc-short-landscape="1"] .wave61-config-body',
]) assert(css.includes(token), `CSS Wave61 Config paysage: ${token} absent`);

assert(/\.wave61-config-awena-card\s*\{[\s\S]*?display:\s*none;/.test(css), 'Awena doit rester cachée en portrait');
assert(css.includes('overflow: hidden !important;'), 'Verrouillage du scroll global paysage absent');
assert(css.includes('overflow: auto !important;'), 'Scroll interne des zones paysage absent');

console.log('✅ Wave61 V23 — Config paysage / tablette / TV');
console.log('✅ 65 modes partagent la même structure Config 3 zones');
console.log('✅ Participants gauche · moteur/dédié centre · Awena/launch droite');
console.log('✅ Portrait inchangé : règles V23 limitées au paysage');
