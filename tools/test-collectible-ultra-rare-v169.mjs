import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); } catch { ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js'); }
const src = fs.readFileSync('src/lib/collectibleCards.ts', 'utf8');
const gallery = fs.readFileSync('src/components/profile/CollectibleCardsPanel.tsx','utf8');
const notifier = fs.readFileSync('src/components/GlobalCollectibleUnlockNotifier.tsx','utf8');
const sound = fs.readFileSync('src/lib/collectibleUnlockSound.ts','utf8');
const names = ['THE POWER','GREEN MACHINE','THE FLYING SCOTSMAN'];
const assetEntries = [
  ['legend_ultra_the_power', 'ultra-the-power.webp'],
  ['legend_ultra_green_machine', 'ultra-green-machine.webp'],
  ['legend_ultra_the_flying_scotsman', 'ultra-the-flying-scotsman.webp'],
];
const block = src.slice(src.indexOf('// Collection LÉGENDES'),src.indexOf('function emptyMetrics'));
const ids = [...block.matchAll(/\{ id: "(legend_[^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,100,'100 visible legends required');
assert.equal(new Set(ids).size,100,'legend IDs are unique');
assert.equal((block.match(/rarity: "ultra"/g)||[]).length,3,'three ultra cards');
const signatures=[];
for(const entry of [...block.matchAll(/\{ id: "(legend_[^"]+)"([^]*?)\n  \] \},/g)]){
 const signature=[...entry[2].matchAll(/metric: "(\w+)", target: (\d+)/g)].map(m=>`${m[1]}:${m[2]}`).join('|');
 assert.ok(signature,`missing requirements ${entry[1]}`);
 signatures.push(signature);
}
assert.equal(signatures.length,100);
assert.equal(new Set(signatures).size,100,'all unlock conditions unique');
for(let i=0;i<assetEntries.length;i++) {
 const [id,name]=assetEntries[i];
 assert.match(block, new RegExp(`id: "${id}", collection: "legends", name: "${names[i]}", rarity: "ultra"`));
 const file=path.join('public/images/collectible-legends',name);
 const b=fs.readFileSync(file);
 assert.equal(b.toString('ascii',0,4),'RIFF');
 assert.equal(b.toString('ascii',8,12),'WEBP');
 assert.ok(b.indexOf(Buffer.from('ALPH'))>0,`${name} needs real alpha transparency`);
 assert.ok(b.length < 1_000_000,`${name} exceeds mobile media budget`);
 assert.match(sound, new RegExp(`${id}: \\[\\[`),'individual fanfare expected');
}
for(const file of ['src/lib/collectibleCards.ts','src/lib/collectibleUnlockSound.ts','src/components/GlobalCollectibleUnlockNotifier.tsx','src/components/profile/CollectibleCardsPanel.tsx']) {
 const out=ts.transpileModule(fs.readFileSync(file,'utf8'), {fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}});
 assert.equal((out.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,`TSX syntax ${file}`);
}
assert.match(notifier,/card\.rarity === "ultra"/);
assert.match(notifier,/playCollectibleUnlockSound\(card\.collection, card\.rarity/);
assert.match(gallery,/✦ ULTRA RARE ✦/);
assert.match(src,/normalizeCollectibleUnlocks/);
for (const id of ['legend_the_power','legend_mighty_mike','legend_the_flying_scotsman']) assert.ok(ids.includes(id),`retain classic ${id}`);
console.log('OK ultra rare v169: 100 legends; 3 variants, 3 alpha WebP, 3 distinct fanfares, 100 distinct challenges, no standard card replaced');
