import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const THEME_FILE = path.join(ROOT, 'src', 'theme', 'themePresets.ts');
const LOCAL_DIR = path.join(ROOT, 'public', 'theme-textures');
const CACHE_DIR = path.join(ROOT, '.mss-theme-restore', 'theme-textures');

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function referencedTextures() {
  const source = fs.readFileSync(THEME_FILE, 'utf8');
  return [...new Set([...source.matchAll(/\/theme-textures\/([^)'"\\s,]+)/g)].map((m) => m[1]))].sort();
}
function validAsset(file, data) {
  const ext = path.extname(file).toLowerCase();
  if (!data || data.length < 16) return false;
  if (ext === '.webp') return data.subarray(0, 4).toString('ascii') === 'RIFF' && data.subarray(8, 12).toString('ascii') === 'WEBP';
  if (ext === '.svg') return data.toString('utf8', 0, Math.min(data.length, 512)).includes('<svg');
  return true;
}
function gitCommitsFor(rel) {
  const res = spawnSync('git', ['log', '--all', '--format=%H', '--', rel], { cwd: ROOT, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  if (res.status !== 0) return [];
  return String(res.stdout || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
}
function gitRead(sha, rel) {
  const res = spawnSync('git', ['show', `${sha}:${rel}`], { cwd: ROOT, encoding: null, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  if (res.status !== 0 || !Buffer.isBuffer(res.stdout)) return null;
  return res.stdout;
}

if (!fs.existsSync(path.join(ROOT, '.git'))) {
  console.error('ERREUR: ce script doit être lancé dans ton dépôt Git complet (le dossier Darts-Counter-V7-GIT).');
  process.exit(2);
}
ensureDir(CACHE_DIR);
const refs = referencedTextures();
let restored = 0;
let already = 0;
const failed = [];
for (const file of refs) {
  const local = path.join(LOCAL_DIR, file);
  const cached = path.join(CACHE_DIR, file);
  if (fs.existsSync(local) || fs.existsSync(cached)) { already++; continue; }
  const rel = `public/theme-textures/${file}`;
  let found = null;
  for (const sha of gitCommitsFor(rel)) {
    const data = gitRead(sha, rel);
    if (data && validAsset(file, data)) { found = data; break; }
  }
  if (!found) { failed.push(file); continue; }
  ensureDir(path.dirname(cached));
  fs.writeFileSync(cached, found);
  restored++;
  console.log(`RESTORE ${file}`);
}
console.log(`\nTextures référencées : ${refs.length}`);
console.log(`Déjà disponibles     : ${already}`);
console.log(`Restaurées depuis Git: ${restored}`);
if (failed.length) {
  console.error(`Introuvables (${failed.length}) :\n${failed.join('\n')}`);
  process.exit(1);
}
console.log('OK — toutes les textures de thèmes ont une source réelle.');
