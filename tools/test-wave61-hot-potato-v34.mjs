import fs from 'node:fs'; import assert from 'node:assert/strict';
const e=fs.readFileSync('src/lib/gameEngines/wave61Engine.ts','utf8');
const fn=e.slice(e.indexOf('function processHotPotato'), e.indexOf('function processZombieSiege'));
assert(fn.includes('fuse -= 1;'),'HOT POTATO doit consommer un cran par visite');
assert.equal((fn.match(/fuse -= 1;/g)||[]).length,1,'HOT POTATO ne doit pas consommer deux crans sur MISS');
assert(fn.includes('passFuseBonus') && fn.includes('explosionDamage'),'options HOT POTATO absentes');
console.log('✅ V34 HOT POTATO: mèche, passe, explosion');
