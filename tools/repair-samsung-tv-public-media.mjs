/**
 * Run AFTER prepare-samsung-tv-package.mjs and BEFORE tizen package.
 * Restore missing public/ resources referenced by literal URLs in the source.
 * Never copy node_modules, originals from src/assets, or unused public pages.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const stage = path.resolve(root, '.mss-samsung-package-stage');
const publicRoot = path.resolve(root, 'public');
const roots = [path.resolve(root, 'src'), path.resolve(root, 'tv-samsung')];
const types = /\.(?:tsx?|jsx?|css|html)$/i;
const supported = /\.(?:webp|png|jpe?g|svg|gif|mp3|m4a|wav|ogg|aac)$/i;
const urlPattern = /["'`](\/(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.% -]+\.(?:webp|png|jpe?g|svg|gif|mp3|m4a|wav|ogg|aac))["'`]/gi;
const literals = new Set();
let sourceFiles = 0;
function scan(folder) {
  if (!fs.existsSync(folder)) return;
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const name = path.join(folder, entry.name);
    if (entry.isDirectory()) { scan(name); continue; }
    if (!types.test(entry.name)) continue;
    sourceFiles++;
    const data = fs.readFileSync(name, 'utf8');
    for (const match of data.matchAll(urlPattern)) { try { literals.add(decodeURIComponent(match[1])); } catch {} }
  }
}

if (!fs.existsSync(stage) || !fs.existsSync(path.join(stage, 'index.html'))) {
  console.error('Etape manquante: lancer d’abord node .\\tools\\prepare-samsung-tv-package.mjs');
  process.exitCode = 1;
} else {
  for (const folder of roots) scan(folder);
  let recovered = 0; let bytes = 0; let missing = 0;
  for (const literal of literals) {
    const relative = literal.replace(/^\/+/, '');
    if (!supported.test(relative)) continue;
    if (relative.includes('..') || relative.includes('\\')) continue;
    const source = path.resolve(publicRoot, relative);
    const target = path.resolve(stage, relative);
    if (!source.startsWith(publicRoot + path.sep) || !target.startsWith(stage + path.sep)) continue;
    if (fs.existsSync(target)) continue;
    if (!fs.existsSync(source)) { missing++; continue; }
    const stat = fs.statSync(source);
    if (!stat.isFile() || stat.size > 25 * 1024 * 1024) continue;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
    recovered++; bytes += stat.size;
    console.log(`MEDIA RESTORE ${relative} (${(stat.size / 1024).toFixed(1)} Kio)`);
  }
  console.log(`SAMSUNG TV MEDIA: ${sourceFiles} fichiers sources audités, ${literals.size} chemins statiques, ${recovered} restaurés (${(bytes/1048576).toFixed(2)} Mio), ${missing} non présents dans public/ (à auditer par jeu).`);
}
