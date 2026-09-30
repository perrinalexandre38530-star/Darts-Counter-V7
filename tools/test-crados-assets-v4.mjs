import assert from 'node:assert/strict';
import fs from 'node:fs';

const required = [
  'public/sounds/dart-hit.mp3',
  'public/sounds/crados/crados-start.mp3',
  'public/sounds/crados/crados-bull.mp3',
  'public/sounds/crados/crados-dbull.mp3',
  'public/sounds/crados/crados-double.mp3',
  'public/sounds/crados/crados-triple.mp3',
  'public/sounds/crados/crados-miss.mp3',
  'public/sounds/crados/crados-turn.mp3',
  'public/sounds/crados/crados-warning.mp3',
  'public/sounds/crados/crados-eliminated.mp3',
  'public/sounds/crados/crados-zone-claimed.mp3',
  'public/sounds/crados/crados-zone-stolen.mp3',
  'public/sounds/crados/crados-dirty-penalty.mp3',
  'public/sounds/crados/crados-leg-win.mp3',
  'public/sounds/crados/crados-victory.mp3',
];
for (const file of required) {
  assert.ok(fs.existsSync(file), `Asset audio CRADOS/X01 manquant: ${file}`);
  assert.ok(fs.statSync(file).size > 256, `Asset audio vide/corrompu: ${file}`);
}
assert.ok(fs.statSync('public/sounds/dart-hit.mp3').size < 32 * 1024, 'dart-hit partagé doit rester très léger');

const sfx = fs.readFileSync('src/lib/cradosSfx.ts', 'utf8');
assert.match(sfx, /hit:\s*["']\/sounds\/dart-hit\.mp3["']/, 'CRADOS doit réutiliser le dart-hit partagé X01');
const x01 = fs.readFileSync('src/lib/x01SfxV3.ts', 'utf8');
assert.match(x01, /dart_hit:\s*["']\/sounds\/dart-hit\.mp3["']/, 'X01 doit pointer vers le même dart-hit partagé');

console.log(`✅ CRADOS ASSETS V4 OK — ${required.length} sons présents, dart-hit partagé=${fs.statSync('public/sounds/dart-hit.mp3').size} octets`);
