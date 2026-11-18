import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// V194 — prépare uniquement les fichiers exécutables pour Tizen CLI.
// Ne signe pas, ne supprime pas les certificats et n'altère pas la version Android.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'MULTISPORTSSCORINGTV');
const dest = path.join(root, '.mss-samsung-package-stage');
const required = ['config.xml', 'index.html', 'icon.png'];
const generated = path.join(source, 'assets');
const MB = 1024 * 1024;

function fail(message) { console.error('❌ ' + message); process.exit(1); }
for (const file of required) {
  const full = path.join(source, file);
  if (!fs.existsSync(full) || !fs.statSync(full).isFile() || !fs.statSync(full).size) fail(`Fichier requis absent/vide : ${full}`);
}
if (!fs.existsSync(generated) || !fs.statSync(generated).isDirectory()) fail('assets/ absent : lancer npm run tv:samsung:build avant ce script.');
const js = fs.readdirSync(generated).filter(f => f.endsWith('.js'));
if (!js.length) fail('Aucun JavaScript dans assets/ : build TV incomplet.');
if (dest === source || dest.startsWith(source + path.sep)) fail('Dossier de distribution doit rester hors du projet Tizen surveillé.');

// Refuser explicitement les symlinks et les fichiers temporaires.
function copySafe(src, dst) {
  const stat = fs.lstatSync(src);
  if (stat.isSymbolicLink()) fail('Lien symbolique inattendu : ' + src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
      if (/\.mss-tmp-|\.wgt$|\.map$/i.test(ent.name)) continue;
      copySafe(path.join(src, ent.name), path.join(dst, ent.name));
    }
  } else if (stat.isFile()) fs.copyFileSync(src, dst);
}

// Uniquement le jeu d'assets de production. Pas de Debug, Release, .tizen-rds, .project.
fs.rmSync(dest, { force: true, recursive: true });
fs.mkdirSync(dest, { recursive: true });
for (const f of required) copySafe(path.join(source, f), path.join(dest, f));
copySafe(generated, path.join(dest, 'assets'));
for (const f of ['css', 'main.js']) {
  const src = path.join(source, f);
  if (fs.existsSync(src) && (fs.statSync(src).isDirectory() || fs.statSync(src).size > 0)) copySafe(src, path.join(dest, f));
}
let total = 0, count = 0;
function checkTree(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) checkTree(f);
    else { count++; total += fs.statSync(f).size; }
  }
}
checkTree(dest);
const html = fs.readFileSync(path.join(dest, 'index.html'), 'utf8');
const assetRefs = [...html.matchAll(/(?:src|href)=["'](?:\.\/|\/)?(assets\/[^"']+)["']/g)].map(m => m[1]);
const missing = assetRefs.filter(f => !fs.existsSync(path.join(dest, f)));
if (missing.length) fail('Assets référencés par index.html absents : ' + missing.join(', '));
console.log('✅ Dossier Tizen propre prêt : ' + dest);
console.log(`✅ ${count} fichiers, ${(total/MB).toFixed(2)} Mio, ${js.length} bundles JS générés.`);
console.log('✅ Debug, Release, .tizen-rds et archives .wgt non copiés.');
console.log('ℹ️ Signature : utiliser le profil existant Samsung dans Tizen CLI avant tout test sur TV.');
