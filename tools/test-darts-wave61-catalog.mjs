import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const file = path.join(root, 'src', 'games', 'dartsWave61.ts');
const source = fs.readFileSync(file, 'utf8');

const rows = [...source.matchAll(/\{\s*id:\s*"([^"]+)",\s*label:\s*"([^"]+)"/g)].map((m) => ({
  id: m[1],
  label: m[2],
}));

assert.equal(rows.length, 61, `61 modes attendus, ${rows.length} trouvés`);
assert.equal(new Set(rows.map((row) => row.id)).size, 61, 'IDs dupliqués dans la Vague 61');
assert.equal(new Set(rows.map((row) => row.label)).size, 61, 'Labels dupliqués dans la Vague 61');
assert.ok(rows.some((row) => row.id === 'apocalypse' && row.label === 'APOCALYPSE'), 'APOCALYPSE absent');
assert.ok(rows.some((row) => row.id === 'microscopia' && row.label === 'MICROSCOPIA'), 'MICROSCOPIA absent');
assert.ok(rows.some((row) => row.id === 'jurassic_dart' && row.label === 'JURASSIC DART'), 'JURASSIC DART absent');
assert.ok(rows.some((row) => row.id === 'align_4' && row.label === 'ALIGN 4'), 'ALIGN 4 absent');
assert.ok(rows.some((row) => row.id === 'sabaudia_dauphine' && row.label === 'SABAUDIA & DAUPHINÉ'), 'SABAUDIA & DAUPHINÉ absent');

console.log('✅ Vague 61: 61 modes, 61 IDs uniques, 61 labels uniques.');
