import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const THEME_SOURCE = path.join(ROOT, 'src', 'theme', 'themePresets.ts');
const OUT_DIR = path.join(ROOT, '.mss-content-packs-build', 'theme-textures');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');
const GENERATED_TS = path.join(ROOT, 'src', 'lib', 'contentPackCatalog.generated.ts');
const EXPECTED_VERSION = '2026.09.03.2';
const MIN_EXPECTED = 110;

function requiredTextures() {
  const source = fs.readFileSync(THEME_SOURCE, 'utf8');
  return [...new Set([...source.matchAll(/\/theme-textures\/([^)'"\s,]+)/g)].map((m) => m[1]))].sort();
}
function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function readCatalog() {
  const source = fs.readFileSync(GENERATED_TS, 'utf8');
  const prefix = 'export const CONTENT_PACK_CATALOG = ';
  const start = source.indexOf(prefix);
  const end = source.lastIndexOf(' as const;');
  if (start < 0 || end < 0) throw new Error('Catalogue genere illisible.');
  return JSON.parse(source.slice(start + prefix.length, end));
}
function sameSet(a, b) { return a.length === b.length && a.every((x, i) => x === b[i]); }

const required = requiredTextures();
if (required.length < MIN_EXPECTED) throw new Error(`Seulement ${required.length} textures referencees; minimum attendu ${MIN_EXPECTED}.`);
if (!fs.existsSync(MANIFEST)) throw new Error('manifest.json theme absent. Lance npm run themes:prepare-pack.');
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
if (manifest.version !== EXPECTED_VERSION) throw new Error(`Version manifest inattendue: ${manifest.version}`);
const manifestPaths = (manifest.files || []).map((x) => x.path).sort();
if (!sameSet(required, manifestPaths)) {
  const missing = required.filter((x) => !manifestPaths.includes(x));
  const extra = manifestPaths.filter((x) => !required.includes(x));
  throw new Error(`Manifest theme incoherent. Manquants=${missing.length}, extras=${extra.length}\n${missing.join('\n')}`);
}

let bytes = 0;
for (const item of manifest.files) {
  const file = path.join(OUT_DIR, ...item.path.split('/'));
  if (!fs.existsSync(file)) throw new Error(`Fichier pack absent: ${item.path}`);
  const st = fs.statSync(file);
  if (st.size !== Number(item.bytes)) throw new Error(`Taille incorrecte: ${item.path}`);
  if (sha256(file) !== item.sha256) throw new Error(`SHA256 incorrect: ${item.path}`);
  bytes += st.size;
}
if (bytes !== Number(manifest.totalBytes)) throw new Error(`Total bytes incorrect: ${bytes} != ${manifest.totalBytes}`);

const catalog = readCatalog()['theme-textures'];
if (!catalog) throw new Error('Entree theme-textures absente du catalogue.');
if (catalog.version !== EXPECTED_VERSION) throw new Error(`Version catalogue inattendue: ${catalog.version}`);
const catalogPaths = (catalog.files || []).map((x) => x.path).sort();
if (!sameSet(required, catalogPaths)) throw new Error('Le catalogue ne contient pas exactement les textures requises.');
if (Number(catalog.totalBytes) !== bytes) throw new Error('Total bytes catalogue != manifest.');

console.log(`OK - ${required.length}/${required.length} textures presentes dans le pack local.`);
console.log(`Version: ${EXPECTED_VERSION}`);
console.log(`Taille : ${(bytes / 1024 / 1024).toFixed(2)} MB`);
console.log('Aucune texture n\'a besoin de rester dans le bundle Android pour ce controle.');
