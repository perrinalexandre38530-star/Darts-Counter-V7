import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); } catch {
  // Repli pour l'environnement de vérification sans node_modules.
  try { ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js'); }
  catch { throw new Error('Installe les dépendances (npm ci) avant ce test.'); }
}

const files = [
  'src/App.tsx',
  'src/lib/collectibleCardImages.ts',
  'src/lib/collectibleUnlockSound.ts',
  'src/components/GlobalCollectibleUnlockNotifier.tsx',
  'src/components/profile/CollectibleCardsPanel.tsx',
];
const sources = Object.fromEntries(files.map((name) => [name, fs.readFileSync(name, 'utf8')]));
for (const [fileName, content] of Object.entries(sources)) {
  const output = ts.transpileModule(content, {
    fileName, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  });
  const errors = (output.diagnostics || []).filter((row) => row.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, `${fileName} contains TS/JSX parse errors: ${errors.map((row) => row.messageText).join('; ')}`);
}
const app = sources['src/App.tsx'];
const global = sources['src/components/GlobalCollectibleUnlockNotifier.tsx'];
const sound = sources['src/lib/collectibleUnlockSound.ts'];
const panel = sources['src/components/profile/CollectibleCardsPanel.tsx'];
const data = fs.readFileSync('src/lib/collectibleCards.ts', 'utf8');
assert.match(app, /<GlobalCollectibleUnlockNotifier[\s\S]*?profileId=/);
assert.match(app, /p\?\.collectibleCards\?\.updatedAt/);
assert.match(app, /persistGlobalCollectibleUnlocks/);
assert.match(global, /dc-history-updated/);
assert.match(global, /dc-darts-firefighter-updated/);
assert.match(global, /createPortal\(/);
assert.match(global, /setQueue\(\(prev\) => \[\.\.\.prev, \.\.\.fresh\]\)/);
assert.match(global, /reconcileCollectibleUnlocks\(knownUnlocks\.current, metrics\)/);
assert.match(global, /window\.setTimeout\(next, 7500\)/);
assert.match(global, /const fresh = newlyUnlocked\.filter/);
assert.doesNotMatch(panel, /\{unlockCard &&/);
for (const collection of ['awena', 'firefighter', 'loterie', 'killer', 'legends']) assert.match(sound, new RegExp('\\b' + collection + ': \\[\\['));
for (const flag of ['masterEnabled', 'arcadeSfxEnabled', 'uiSfxEnabled']) assert.match(sound, new RegExp(flag));
const total = [...data.matchAll(/\bid: "(?:legend_|awena_|firefighter_|loterie_|killer_)[^"\n]+"/g)].length;
assert.ok(total >= 82, 'collectible card data is incomplete');
console.log(`OK Global Collectible Unlock V153 — ${files.length} TS/JSX files parsed, history events, persistence, queue, 5 family sounds, gallery deduplication. ${total} collectible entries.`);
